export type LeadSource = 'facebook' | 'messenger' | 'whatsapp' | 'manual';

export type LeadStatus = 'new' | 'contacted' | 'followup' | 'won' | 'lost';

export interface LeadNote {
  id: string;
  content: string;
  createdAt: string;
  author: string;
}

export interface LeadActivity {
  id: string;
  type: 'created' | 'status_change' | 'note_added' | 'source_merged' | 'contacted' | 'followup_scheduled' | 'assigned' | 'comment' | 'messenger' | 'whatsapp' | (string & {});
  description: string;
  timestamp: string;
  details?: string;
  postLink?: string;
  channel?: 'comment' | 'messenger' | 'whatsapp' | string;
}

export interface Lead {
  id: string;
  name: string;
  phone?: string;              // Normalized format: e.g., 01712345678 (optional for Messenger leads)
  originalPhone?: string;      // As entered: e.g., +8801712-345678
  messengerId?: string;        // Facebook PSID (Page-Scoped ID)
  profileLink?: string;        // Facebook profile URL or Messenger link
  lastChannel?: 'comment' | 'messenger' | string; // 'comment' or 'messenger'
  lastMessage?: string;        // Latest incoming message
  lastMessageAt?: string;      // ISO string timestamp of the latest message
  lastPostId?: string;         // Facebook Post ID from which lead commented
  lastPostLink?: string;       // Facebook Post URL
  source: LeadSource;         // Primary or first source
  sources: LeadSource[];      // All sources this lead has interacted through (for duplicate merges)
  productInterest: string;    // Product/Service of interest
  message: string;            // Initial message / lead note
  status: LeadStatus;
  tags: string[];             // e.g., 'গরম লিড', 'দাম জানতে চেয়েছে'
  createdAt: string;          // ISO string
  updatedAt: string;          // ISO string
  followUpDate?: string | null;     // YYYY-MM-DD or ISO (n8n & standard)
  nextFollowUpDate?: string | null; // Legacy alias
  assignedTo: string | null;  // Team member name
  notes: LeadNote[];
  activities: LeadActivity[];
  estimatedValue?: number;    // Estimated deal value in BDT
  isStarred?: boolean;
  lastSeenAt?: string;        // ISO string timestamp when admin last viewed/read latest message
  pageId?: string;            // Facebook Page ID where interaction occurred
  pageName?: string;          // Facebook Page Name
}

export interface LeadFilterState {
  searchQuery: string;
  source: 'all' | LeadSource;
  status: 'all' | LeadStatus;
  tag: string;
  page: string;
  dateRange: 'all' | 'today' | 'this_week' | 'this_month' | 'custom';
  onlyFollowUpToday: boolean;
  sortBy: 'newest' | 'oldest' | 'name' | 'followup';
}

export interface WebhookPayload {
  name: string;
  phone?: string;
  messengerId?: string;
  profileLink?: string;
  lastChannel?: 'comment' | 'messenger' | string;
  lastMessage?: string;
  lastMessageAt?: string;
  lastPostId?: string;
  lastPostLink?: string;
  postLink?: string;
  source: string;
  message?: string;
  productInterest?: string;
  tag?: string;
  tags?: string[];
  assignedTo?: string;
  estimatedValue?: number;
}

