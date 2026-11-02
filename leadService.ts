import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Lead, LeadActivity, LeadNote, LeadSource, LeadStatus } from '../types/lead';
import { INITIAL_DEMO_LEADS } from '../data/demoLeads';
import { normalizeBdPhoneNumber, formatBdPhoneNumber } from '../utils/phone';
import { SOURCE_LABELS, STATUS_LABELS } from '../utils/formatters';
import { initializeFirebaseInstances, isFirebaseConfigured } from '../firebase/config';

const STORAGE_KEY = 'unified_lead_inbox_leads_v1';
const FIRESTORE_CACHE_KEY = 'unified_lead_inbox_firestore_v2';
const TEAM_MEMBERS_KEY = 'unified_lead_inbox_team_v1';
const TAGS_KEY = 'unified_lead_inbox_tags_v1';

// Real-time multi-tab BroadcastChannel
const broadcastChannel = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('unified_lead_sync_channel')
  : null;

if (broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    if (event.data?.type === 'leads_updated') {
      window.dispatchEvent(new CustomEvent('leads_storage_updated'));
    }
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === FIRESTORE_CACHE_KEY) {
      window.dispatchEvent(new CustomEvent('leads_storage_updated'));
    }
  });
}

export interface AddLeadResult {
  isDuplicate: boolean;
  lead: Lead;
  mergedSources?: LeadSource[];
  notificationMessage: string;
}

export interface SummaryStats {
  totalLeads: number;
  todayNewLeads: number;
  facebookCount: number;
  messengerCount: number;
  whatsappCount: number;
  manualCount: number;
  todayFollowUpCount: number;
  wonCount: number;
  lostCount: number;
  totalEstimatedPipelineValue: number;
  unreadCount: number;
}

export interface FirestoreErrorPayload {
  code: string;
  message: string;
  details: string;
}

class LeadService {
  /**
   * Retrieves all leads.
   * If Firebase is configured, reads strictly from Firestore cache and NEVER from old localStorage mock data.
   */
  public getLeads(): Lead[] {
    const isFb = isFirebaseConfigured();
    const cacheKey = isFb ? FIRESTORE_CACHE_KEY : STORAGE_KEY;

    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading leads from storage:', e);
    }
    // Default is empty array
    return [];
  }

  /**
   * Saves leads array to local storage and broadcasts update event
   */
  public saveLeads(leads: Lead[]): void {
    const isFb = isFirebaseConfigured();
    const cacheKey = isFb ? FIRESTORE_CACHE_KEY : STORAGE_KEY;

    try {
      localStorage.setItem(cacheKey, JSON.stringify(leads));
      window.dispatchEvent(new CustomEvent('leads_storage_updated'));
      broadcastChannel?.postMessage({ type: 'leads_updated' });
    } catch (e) {
      console.error('Error saving leads to storage:', e);
    }
  }

  /**
   * Real-time Firestore subscription via onSnapshot.
   * If Firestore is configured, attaches a real-time listener to the 'leads' collection.
   * If Firestore errors (e.g. permission-denied), reports error to onError callback and does NOT fall back to fake leads.
   */
  public subscribeToLeads(
    onUpdate: (leads: Lead[]) => void,
    onError?: (error: FirestoreErrorPayload) => void
  ): () => void {
    const { db } = initializeFirebaseInstances();

    if (isFirebaseConfigured() && db) {
      try {
        const leadsCol = collection(db, 'leads');
        const unsubscribe = onSnapshot(
          leadsCol,
          (snapshot) => {
            const firestoreLeads: Lead[] = [];
            snapshot.forEach((docSnapshot) => {
              const data = docSnapshot.data() as any;
              // Explicitly extract lastChannel from Firestore document data
              const rawLastChannel = data.lastChannel ?? data.last_channel ?? data.LastChannel ?? null;
              const cleanLastChannel = rawLastChannel ? String(rawLastChannel).trim().toLowerCase() : undefined;

              // Ensure sources array has values
              const rawSources = Array.isArray(data.sources) && data.sources.length > 0
                ? data.sources
                : (data.source ? [data.source] : ['facebook']);

              const leadItem: Lead = {
                id: docSnapshot.id || data.id,
                name: data.name || (data.messengerId ? `Messenger User (${String(data.messengerId).slice(-4)})` : 'অজ্ঞাত লিড'),
                phone: data.phone || data.originalPhone || undefined,
                originalPhone: data.originalPhone || data.phone || undefined,
                source: data.source || rawSources[0] || 'facebook',
                sources: rawSources,
                messengerId: data.messengerId ? String(data.messengerId) : undefined,
                profileLink: data.profileLink || undefined,
                message: data.message || data.lastMessage || '',
                lastMessage: data.lastMessage || data.message || undefined,
                lastMessageAt: data.lastMessageAt || data.createdAt || undefined,
                status: data.status || 'new',
                tags: Array.isArray(data.tags) ? data.tags : [],
                isStarred: Boolean(data.isStarred),
                assignedTo: data.assignedTo || null,
                followUpDate: data.followUpDate || data.nextFollowUpDate || null,
                nextFollowUpDate: data.nextFollowUpDate || data.followUpDate || null,
                notes: Array.isArray(data.notes) ? data.notes : [],
                activities: Array.isArray(data.activities) ? data.activities : [],
                createdAt: data.createdAt || new Date().toISOString(),
                updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
                pageId: data.pageId ? String(data.pageId) : undefined,
                pageName: data.pageName ? String(data.pageName) : undefined,
                lastChannel: cleanLastChannel,
                lastPostId: data.lastPostId ? String(data.lastPostId) : undefined,
                lastPostLink: data.lastPostLink ? String(data.lastPostLink) : undefined,
                estimatedValue: typeof data.estimatedValue === 'number' ? data.estimatedValue : 0,
                productInterest: data.productInterest || 'সাধারণ অনুসন্ধান',
              };

              firestoreLeads.push(leadItem);
            });

            // Sort newest first
            firestoreLeads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            // Save to Firestore specific cache
            localStorage.setItem(FIRESTORE_CACHE_KEY, JSON.stringify(firestoreLeads));
            onUpdate(firestoreLeads);
          },
          (error) => {
            console.error('Firestore onSnapshot error:', error);
            let userFriendlyDetails = error.message;

            if (error.code === 'permission-denied') {
              userFriendlyDetails =
                'অনুমতি মেলেনি (permission-denied): Firestore Security Rules অ্যাক্সেস করতে বাধা দিচ্ছে। অনুগ্রহ করে Firebase Console > Firestore Database > Rules ট্যাবে রুলস পাবলিশ করা হয়েছে কি না এবং আপনি sobujbd679@gmail.com দিয়ে লগইন করেছেন কি না নিশ্চিত করুন।';
            } else if (error.code === 'unavailable') {
              userFriendlyDetails = 'Firestore সার্ভিস বর্তমানে সংযোগ পাচ্ছে না (unavailable)। ইন্টারনেট সংযোগ পরীক্ষা করুন।';
            }

            if (onError) {
              onError({
                code: error.code,
                message: error.message,
                details: userFriendlyDetails,
              });
            }
            // Do NOT fall back to old 17 fake leads! Keep list empty or cache-only
            onUpdate([]);
          }
        );

        return unsubscribe;
      } catch (err: any) {
        console.error('Error subscribing to Firestore leads:', err);
        if (onError) {
          onError({
            code: err?.code || 'unknown',
            message: err?.message || String(err),
            details: 'Firestore কানেকশন শুরু করতে ব্যর্থ হয়েছে। Firebase কনফিগারেশন চেক করুন।',
          });
        }
        onUpdate([]);
        return () => {};
      }
    }

    // Local fallback listener (only when Firebase is not configured at all)
    const handleLocalUpdate = () => {
      onUpdate(this.getLeads());
    };

    window.addEventListener('leads_storage_updated', handleLocalUpdate);
    // Initial call
    onUpdate(this.getLeads());

    return () => {
      window.removeEventListener('leads_storage_updated', handleLocalUpdate);
    };
  }

  /**
   * Finds an existing lead with the same normalized phone number
   */
  public findLeadByPhone(rawPhone?: string | null, excludeId?: string): Lead | undefined {
    if (!rawPhone || !rawPhone.trim()) return undefined;
    const normalizedTarget = normalizeBdPhoneNumber(rawPhone);
    if (!normalizedTarget || normalizedTarget.length < 10) return undefined;

    const leads = this.getLeads();
    return leads.find(
      (l) => l.id !== excludeId && l.phone && normalizeBdPhoneNumber(l.phone) === normalizedTarget
    );
  }

  /**
   * Finds an existing lead with the same Facebook Messenger PSID
   */
  public findLeadByMessengerId(messengerId?: string | null, excludeId?: string): Lead | undefined {
    if (!messengerId || !messengerId.trim()) return undefined;
    const target = messengerId.trim();

    const leads = this.getLeads();
    return leads.find(
      (l) => l.id !== excludeId && l.messengerId && l.messengerId.trim() === target
    );
  }

  /**
   * Checks for duplicate lead:
   * 1. Priority 1: Match by normalized BD phone number if phone exists.
   * 2. Priority 2: Match by Facebook Messenger PSID if phone is absent or doesn't match.
   */
  public findDuplicateLead(
    params: { phone?: string | null; messengerId?: string | null },
    excludeId?: string
  ): Lead | undefined {
    // 1. Phone check
    if (params.phone) {
      const matchByPhone = this.findLeadByPhone(params.phone, excludeId);
      if (matchByPhone) return matchByPhone;
    }

    // 2. Messenger ID check
    if (params.messengerId) {
      const matchByMessenger = this.findLeadByMessengerId(params.messengerId, excludeId);
      if (matchByMessenger) return matchByMessenger;
    }

    return undefined;
  }

  /**
   * Adds a new lead or gracefully merges if a duplicate phone number or messengerId is detected.
   * Syncs to both Firestore (if configured) and localStorage.
   */
  public async addOrMergeLeadAsync(params: {
    name: string;
    phone?: string | null;
    messengerId?: string | null;
    profileLink?: string | null;
    lastChannel?: 'comment' | 'messenger' | string | null;
    lastMessage?: string | null;
    lastMessageAt?: string | null;
    lastPostId?: string | null;
    lastPostLink?: string | null;
    pageId?: string | null;
    pageName?: string | null;
    source: LeadSource;
    productInterest?: string;
    message?: string;
    status?: LeadStatus;
    tags?: string[];
    nextFollowUpDate?: string | null;
    followUpDate?: string | null;
    assignedTo?: string | null;
    estimatedValue?: number;
  }): Promise<AddLeadResult> {
    const { db } = initializeFirebaseInstances();
    const normalizedPhone = params.phone ? normalizeBdPhoneNumber(params.phone) : '';
    const cleanMessengerId = params.messengerId?.trim() || '';
    const leads = this.getLeads();

    // Check duplicate locally:
    // Priority 1: Phone match
    let existingIndex = -1;
    let matchType: 'phone' | 'messenger' = 'phone';

    if (normalizedPhone && normalizedPhone.length >= 10) {
      existingIndex = leads.findIndex(
        (l) => l.phone && normalizeBdPhoneNumber(l.phone) === normalizedPhone
      );
      if (existingIndex !== -1) {
        matchType = 'phone';
      }
    }

    // Priority 2: Messenger PSID match if not found by phone
    if (existingIndex === -1 && cleanMessengerId) {
      existingIndex = leads.findIndex(
        (l) => l.messengerId && l.messengerId.trim() === cleanMessengerId
      );
      if (existingIndex !== -1) {
        matchType = 'messenger';
      }
    }

    const nowIso = new Date().toISOString();

    if (existingIndex !== -1) {
      // DUPLICATE DETECTED: MERGE!
      const existing = { ...leads[existingIndex] };
      const previousSources = [...existing.sources];
      const isNewSource = !existing.sources.includes(params.source);

      if (isNewSource) {
        existing.sources = [...existing.sources, params.source];
      }

      // If existing lead didn't have phone, but incoming has phone: update phone!
      if (!existing.phone && normalizedPhone) {
        existing.phone = normalizedPhone;
        existing.originalPhone = params.phone || undefined;
      }

      // If incoming has messengerId and existing doesn't: update messengerId
      if (cleanMessengerId && !existing.messengerId) {
        existing.messengerId = cleanMessengerId;
      }

      // If incoming has profileLink: update profileLink
      if (params.profileLink?.trim()) {
        existing.profileLink = params.profileLink.trim();
      }

      if (params.pageId?.trim() && !existing.pageId) {
        existing.pageId = params.pageId.trim();
      }
      if (params.pageName?.trim() && !existing.pageName) {
        existing.pageName = params.pageName.trim();
      }

      // Update latest message
      const incomingMessage = params.lastMessage || params.message;
      if (incomingMessage?.trim()) {
        existing.lastMessage = incomingMessage.trim();
        existing.lastMessageAt = params.lastMessageAt || nowIso;
      }

      if (params.productInterest && !existing.productInterest.includes(params.productInterest)) {
        existing.productInterest = `${existing.productInterest} / ${params.productInterest}`;
      }

      if (params.estimatedValue && params.estimatedValue > 0) {
        existing.estimatedValue = (existing.estimatedValue || 0) + params.estimatedValue;
      }

      if (params.lastChannel) {
        existing.lastChannel = params.lastChannel;
      } else if (params.lastPostLink || params.lastPostId) {
        existing.lastChannel = 'comment';
      } else if (cleanMessengerId || params.source === 'messenger') {
        existing.lastChannel = 'messenger';
      }
      if (params.lastPostId) existing.lastPostId = params.lastPostId;
      if (params.lastPostLink) existing.lastPostLink = params.lastPostLink;

      if (params.tags && params.tags.length > 0) {
        const set = new Set([...existing.tags, ...params.tags]);
        existing.tags = Array.from(set);
      }

      const sourceLabelNew = SOURCE_LABELS[params.source] || params.source;
      const prevLabels = previousSources.map((s) => SOURCE_LABELS[s] || s).join(', ');
      const matchReason = matchType === 'phone'
        ? `ফোন নম্বর (${formatBdPhoneNumber(existing.phone)})`
        : `Messenger PSID (${cleanMessengerId})`;

      const mergeActivity: LeadActivity = {
        id: 'act-' + Date.now(),
        type: params.lastChannel === 'comment' || params.lastPostLink ? 'comment' : 'source_merged',
        description: `ডুপ্লিকেট ইনটেক (${matchReason} দিয়ে মার্জ): লিডটি পুনরায় ${sourceLabelNew} থেকে যোগাযোগ করেছে (পূর্বের সোর্স: ${prevLabels})।`,
        timestamp: nowIso,
        details: incomingMessage ? `বার্তা: "${incomingMessage}"` : undefined,
        channel: existing.lastChannel,
        postLink: params.lastPostLink || undefined,
      };
      existing.activities = [mergeActivity, ...existing.activities];
      existing.updatedAt = nowIso;

      if (incomingMessage && incomingMessage.trim()) {
        const newNote: LeadNote = {
          id: 'note-' + Date.now(),
          content: `[${sourceLabelNew} থেকে প্রাপ্ত নতুন বার্তা]: ${incomingMessage.trim()}`,
          createdAt: nowIso,
          author: 'সিস্টেম অটো-মার্জ',
        };
        existing.notes = [newNote, ...existing.notes];
      }

      // Sync to Firestore
      if (isFirebaseConfigured() && db) {
        try {
          await setDoc(doc(db, 'leads', existing.id), existing, { merge: true });
        } catch (e) {
          console.error('Failed to sync merged lead to Firestore:', e);
        }
      }

      leads[existingIndex] = existing;
      this.saveLeads(leads);

      return {
        isDuplicate: true,
        lead: existing,
        mergedSources: existing.sources,
        notificationMessage: `লিড মার্জ সম্পন্ন! "${existing.name}" (${matchReason}) আগের লিডের সাথে একত্রিত করা হয়েছে।`,
      };
    }

    // NEW LEAD CREATION
    const newLead: Lead = {
      id: 'lead-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: params.name.trim() || (cleanMessengerId ? `Messenger User (${cleanMessengerId.slice(-4)})` : 'অজ্ঞাত লিড'),
      phone: normalizedPhone || (params.phone?.trim() ? params.phone.trim() : undefined),
      originalPhone: params.phone?.trim() ? params.phone.trim() : undefined,
      messengerId: cleanMessengerId || undefined,
      profileLink: params.profileLink?.trim() || undefined,
      lastChannel: params.lastChannel || (params.lastPostLink || params.lastPostId ? 'comment' : (cleanMessengerId || params.source === 'messenger' ? 'messenger' : undefined)),
      lastMessage: (params.lastMessage || params.message)?.trim() || undefined,
      lastMessageAt: params.lastMessageAt || (params.message ? nowIso : undefined),
      lastPostId: params.lastPostId?.trim() || undefined,
      lastPostLink: params.lastPostLink?.trim() || undefined,
      pageId: params.pageId?.trim() || undefined,
      pageName: params.pageName?.trim() || undefined,
      source: params.source,
      sources: [params.source],
      productInterest: params.productInterest?.trim() || 'সাধারণ অনুসন্ধান',
      message: params.message?.trim() || params.lastMessage?.trim() || 'কোনো বার্তা নেই',
      status: params.status || 'new',
      tags: params.tags || [],
      createdAt: nowIso,
      updatedAt: nowIso,
      followUpDate: params.followUpDate || params.nextFollowUpDate || null,
      nextFollowUpDate: params.followUpDate || params.nextFollowUpDate || null,
      assignedTo: params.assignedTo || null,
      estimatedValue: params.estimatedValue || 0,
      isStarred: false,
      notes: (params.message?.trim() || params.lastMessage?.trim())
        ? [
            {
              id: 'note-' + Date.now(),
              content: (params.message || params.lastMessage)!.trim(),
              createdAt: nowIso,
              author: params.source === 'messenger' ? 'Messenger গ্রাহক' : 'গ্রাহকের প্রথম মেসেজ',
            },
          ]
        : [],
      activities: [
        {
          id: 'act-' + Date.now(),
          type: (params.lastChannel === 'comment' || params.lastPostLink) ? 'comment' : 'created',
          description: `${SOURCE_LABELS[params.source]} থেকে নতুন লিড ইনবক্সে যুক্ত হয়েছে${cleanMessengerId ? ` (Messenger PSID: ${cleanMessengerId})` : ''}।`,
          timestamp: nowIso,
          channel: params.lastChannel || (params.lastPostLink ? 'comment' : (cleanMessengerId || params.source === 'messenger' ? 'messenger' : undefined)),
          postLink: params.lastPostLink?.trim() || undefined,
        },
      ],
    };

    // Sync to Firestore
    if (isFirebaseConfigured() && db) {
      try {
        await setDoc(doc(db, 'leads', newLead.id), newLead);
      } catch (e) {
        console.error('Failed to save new lead to Firestore:', e);
      }
    }

    const updatedList = [newLead, ...leads];
    this.saveLeads(updatedList);

    return {
      isDuplicate: false,
      lead: newLead,
      notificationMessage: `সফলভাবে নতুন লিড যোগ করা হয়েছে: ${newLead.name} (${SOURCE_LABELS[newLead.source]})`,
    };
  }

  /**
   * Synchronous wrapper for addOrMergeLead
   */
  public addOrMergeLead(params: {
    name: string;
    phone?: string | null;
    messengerId?: string | null;
    profileLink?: string | null;
    lastChannel?: 'comment' | 'messenger' | string | null;
    lastMessage?: string | null;
    lastMessageAt?: string | null;
    lastPostId?: string | null;
    lastPostLink?: string | null;
    pageId?: string | null;
    pageName?: string | null;
    source: LeadSource;
    productInterest?: string;
    message?: string;
    status?: LeadStatus;
    tags?: string[];
    nextFollowUpDate?: string | null;
    followUpDate?: string | null;
    assignedTo?: string | null;
    estimatedValue?: number;
  }): AddLeadResult {
    const leads = this.getLeads();
    const normalizedPhone = params.phone ? normalizeBdPhoneNumber(params.phone) : '';
    const cleanMessengerId = params.messengerId?.trim() || '';

    let existingIndex = -1;
    if (normalizedPhone && normalizedPhone.length >= 10) {
      existingIndex = leads.findIndex(
        (l) => l.phone && normalizeBdPhoneNumber(l.phone) === normalizedPhone
      );
    }
    if (existingIndex === -1 && cleanMessengerId) {
      existingIndex = leads.findIndex(
        (l) => l.messengerId && l.messengerId.trim() === cleanMessengerId
      );
    }

    // Trigger async sync in background
    this.addOrMergeLeadAsync(params).catch(console.error);

    if (existingIndex !== -1) {
      return {
        isDuplicate: true,
        lead: leads[existingIndex],
        notificationMessage: `লিড মার্জ হচ্ছে...`,
      };
    }

    const nowIso = new Date().toISOString();
    const tempLead: Lead = {
      id: 'lead-' + Date.now(),
      name: params.name || (cleanMessengerId ? `Messenger User (${cleanMessengerId.slice(-4)})` : 'অজ্ঞাত লিড'),
      phone: normalizedPhone || (params.phone?.trim() ? params.phone.trim() : undefined),
      messengerId: cleanMessengerId || undefined,
      profileLink: params.profileLink?.trim() || undefined,
      lastMessage: (params.lastMessage || params.message)?.trim() || undefined,
      lastMessageAt: params.lastMessageAt || nowIso,
      source: params.source,
      sources: [params.source],
      productInterest: params.productInterest || '',
      message: params.message || params.lastMessage || '',
      status: params.status || 'new',
      tags: params.tags || [],
      createdAt: nowIso,
      updatedAt: nowIso,
      followUpDate: params.followUpDate || params.nextFollowUpDate || null,
      nextFollowUpDate: params.followUpDate || params.nextFollowUpDate || null,
      assignedTo: params.assignedTo || null,
      estimatedValue: params.estimatedValue || 0,
      notes: [],
      activities: [],
    };

    return {
      isDuplicate: false,
      lead: tempLead,
      notificationMessage: `লিড যোগ করা হয়েছে: ${tempLead.name}`,
    };
  }


  /**
   * Updates existing lead fields in Firestore and localStorage
   */
  public async updateLead(id: string, updates: Partial<Lead>, editorName = 'অ্যাডমিন'): Promise<Lead | null> {
    const leads = this.getLeads();
    const index = leads.findIndex((l) => l.id === id);
    if (index === -1) return null;

    const current = leads[index];
    const nowIso = new Date().toISOString();
    const activities: LeadActivity[] = [...current.activities];

    if (updates.status && updates.status !== current.status) {
      activities.unshift({
        id: 'act-' + Date.now(),
        type: 'status_change',
        description: `স্ট্যাটাস পরিবর্তন: ${STATUS_LABELS[current.status]} → ${STATUS_LABELS[updates.status]} (${editorName})`,
        timestamp: nowIso,
      });
    }

    if (updates.nextFollowUpDate !== undefined && updates.nextFollowUpDate !== current.nextFollowUpDate) {
      activities.unshift({
        id: 'act-' + Date.now(),
        type: 'followup_scheduled',
        description: updates.nextFollowUpDate
          ? `ফলো-আপ নির্ধারিত: ${updates.nextFollowUpDate} (${editorName})`
          : `ফলো-আপ বাতিল করা হয়েছে (${editorName})`,
        timestamp: nowIso,
      });
    }

    if (updates.assignedTo !== undefined && updates.assignedTo !== current.assignedTo) {
      activities.unshift({
        id: 'act-' + Date.now(),
        type: 'assigned',
        description: updates.assignedTo
          ? `অ্যাসাইন করা হয়েছে: ${updates.assignedTo}`
          : 'অ্যাসাইনমেন্ট বাতিল করা হয়েছে',
        timestamp: nowIso,
      });
    }

    const updatedLead: Lead = {
      ...current,
      ...updates,
      updatedAt: nowIso,
      activities,
    };

    // Sync to Firestore
    const { db } = initializeFirebaseInstances();
    if (isFirebaseConfigured() && db) {
      try {
        await setDoc(doc(db, 'leads', id), updatedLead, { merge: true });
      } catch (e) {
        console.error('Failed to update lead in Firestore:', e);
      }
    }

    leads[index] = updatedLead;
    this.saveLeads(leads);
    return updatedLead;
  }

  /**
   * Adds an internal note to a lead
   */
  public async addNote(leadId: string, content: string, author = 'অ্যাডমিন'): Promise<Lead | null> {
    if (!content.trim()) return null;
    const leads = this.getLeads();
    const index = leads.findIndex((l) => l.id === leadId);
    if (index === -1) return null;

    const current = leads[index];
    const nowIso = new Date().toISOString();

    const newNote: LeadNote = {
      id: 'note-' + Date.now(),
      content: content.trim(),
      createdAt: nowIso,
      author,
    };

    const newActivity: LeadActivity = {
      id: 'act-' + Date.now(),
      type: 'note_added',
      description: `নতুন নোট যুক্ত করেছেন: ${author}`,
      timestamp: nowIso,
    };

    const updatedLead: Lead = {
      ...current,
      updatedAt: nowIso,
      notes: [newNote, ...current.notes],
      activities: [newActivity, ...current.activities],
    };

    const { db } = initializeFirebaseInstances();
    if (isFirebaseConfigured() && db) {
      try {
        await setDoc(doc(db, 'leads', leadId), updatedLead, { merge: true });
      } catch (e) {
        console.error('Failed to sync note to Firestore:', e);
      }
    }

    leads[index] = updatedLead;
    this.saveLeads(leads);
    return updatedLead;
  }

  /**
   * Sets lead status
   */
  public setLeadStatus(leadId: string, newStatus: LeadStatus): Promise<Lead | null> {
    return this.updateLead(leadId, { status: newStatus });
  }

  /**
   * Toggles star / favorite status
   */
  public toggleStar(leadId: string): Promise<Lead | null> {
    const leads = this.getLeads();
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return Promise.resolve(null);
    return this.updateLead(leadId, { isStarred: !lead.isStarred });
  }

  /**
   * Deletes a lead from Firestore (and local state)
   */
  public async deleteLead(leadId: string): Promise<{ success: boolean; message: string; error?: any }> {
    const { db } = initializeFirebaseInstances();
    const isFb = isFirebaseConfigured();

    if (isFb && db) {
      try {
        await deleteDoc(doc(db, 'leads', leadId));
      } catch (err: any) {
        console.error('Failed to delete lead from Firestore:', err);
        let errorDetails = err?.message || 'অজানা ত্রুটি';
        if (err?.code === 'permission-denied' || String(err).includes('permission-denied')) {
          errorDetails = 'অনুমতি নেই (permission-denied): Firestore Security Rules এ ডিলিট করার পারমিশন মেলেনি। Firebase Console-এর Rules পাবলিশ করা আছে কি না এবং আপনি sobujbd679@gmail.com দিয়ে লগইন করেছেন কি না নিশ্চিত করুন।';
        }
        return {
          success: false,
          message: `Firestore থেকে লিড মুছতে ব্যর্থ হয়েছে: ${errorDetails}`,
          error: err,
        };
      }
    }

    const leads = this.getLeads();
    const filtered = leads.filter((l) => l.id !== leadId);
    this.saveLeads(filtered);

    return {
      success: true,
      message: 'লিডটি সফলভাবে মুছে ফেলা হয়েছে!',
    };
  }

  /**
   * Requirement 5: Seeds demo leads to Firestore / LocalStorage on explicit user click
   */
  public async loadDemoLeads(): Promise<number> {
    const { db } = initializeFirebaseInstances();
    const leads = this.getLeads();

    if (isFirebaseConfigured() && db) {
      try {
        const batch = writeBatch(db);
        INITIAL_DEMO_LEADS.forEach((demoLead) => {
          const docRef = doc(db, 'leads', demoLead.id);
          batch.set(docRef, demoLead);
        });
        await batch.commit();
      } catch (e) {
        console.error('Failed to batch load demo leads to Firestore:', e);
      }
    }

    // Combine avoiding duplicate IDs
    const existingIds = new Set(leads.map((l) => l.id));
    const newItems = INITIAL_DEMO_LEADS.filter((d) => !existingIds.has(d.id));
    const combined = [...leads, ...newItems];
    this.saveLeads(combined);
    return INITIAL_DEMO_LEADS.length;
  }

  /**
   * Requirement 5: Deletes all demo leads, keeping only the user's real leads
   */
  public async deleteDemoLeads(): Promise<{ deletedCount: number; remainingCount: number }> {
    const { db } = initializeFirebaseInstances();
    const leads = this.getLeads();
    const demoIdSet = new Set(INITIAL_DEMO_LEADS.map((l) => l.id));

    if (isFirebaseConfigured() && db) {
      try {
        const batch = writeBatch(db);
        leads.forEach((l) => {
          if (demoIdSet.has(l.id) || l.id.startsWith('lead-demo-')) {
            batch.delete(doc(db, 'leads', l.id));
          }
        });
        await batch.commit();
      } catch (e) {
        console.error('Failed to batch delete demo leads from Firestore:', e);
      }
    }

    const realLeads = leads.filter((l) => !demoIdSet.has(l.id) && !l.id.startsWith('lead-demo-'));
    const deletedCount = leads.length - realLeads.length;
    this.saveLeads(realLeads);
    return { deletedCount, remainingCount: realLeads.length };
  }

  /**
   * Clears all leads completely
   */
  public async clearAllLeads(): Promise<void> {
    const { db } = initializeFirebaseInstances();
    const leads = this.getLeads();

    if (isFirebaseConfigured() && db) {
      try {
        const batch = writeBatch(db);
        leads.forEach((l) => {
          batch.delete(doc(db, 'leads', l.id));
        });
        await batch.commit();
      } catch (e) {
        console.error('Failed to clear all leads in Firestore:', e);
      }
    }

    this.saveLeads([]);
  }

  /**
   * Calculates dashboard summary statistics
   */
  public getSummaryStats(leads: Lead[]): SummaryStats {
    const today = new Date().toISOString().split('T')[0];

    let todayNewLeads = 0;
    let facebookCount = 0;
    let messengerCount = 0;
    let whatsappCount = 0;
    let manualCount = 0;
    let todayFollowUpCount = 0;
    let wonCount = 0;
    let lostCount = 0;
    let totalEstimatedPipelineValue = 0;
    let unreadCount = 0;

    for (const l of leads) {
      if (l.sources.includes('facebook') || l.source === 'facebook') facebookCount++;
      if (l.sources.includes('messenger') || l.source === 'messenger') messengerCount++;
      if (l.sources.includes('whatsapp') || l.source === 'whatsapp') whatsappCount++;
      if (l.sources.includes('manual') || l.source === 'manual') manualCount++;

      if (l.createdAt.startsWith(today)) {
        todayNewLeads++;
      }

      const followUpVal = l.followUpDate || l.nextFollowUpDate;
      if (followUpVal && followUpVal.startsWith(today) && l.status !== 'won' && l.status !== 'lost') {
        todayFollowUpCount++;
      }

      if (l.status === 'won') wonCount++;
      if (l.status === 'lost') lostCount++;

      if (l.estimatedValue) {
        totalEstimatedPipelineValue += l.estimatedValue;
      }

      if (l.lastMessageAt && (!l.lastSeenAt || new Date(l.lastMessageAt).getTime() > new Date(l.lastSeenAt).getTime())) {
        unreadCount++;
      }
    }

    return {
      totalLeads: leads.length,
      todayNewLeads,
      facebookCount,
      messengerCount,
      whatsappCount,
      manualCount,
      todayFollowUpCount,
      wonCount,
      lostCount,
      totalEstimatedPipelineValue,
      unreadCount,
    };
  }
}

export const leadService = new LeadService();
