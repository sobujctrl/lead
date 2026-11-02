import React, { useState } from 'react';
import {
  Upload,
  Download,
  Webhook,
  CheckCircle,
  Copy,
  Play,
  FileSpreadsheet,
  AlertTriangle,
  Code,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Lead, LeadSource } from '../../types/lead';
import { leadService } from '../../services/leadService';
import { exportLeadsToCSV } from '../../utils/formatters';
import { normalizeBdPhoneNumber } from '../../utils/phone';

interface ImportExportViewProps {
  leads: Lead[];
  onLeadsUpdated: () => void;
  onShowToast: (msg: string) => void;
}

export const ImportExportView: React.FC<ImportExportViewProps> = ({
  leads,
  onLeadsUpdated,
  onShowToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'webhook' | 'csv_import' | 'export'>('webhook');

  // Webhook Simulator State
  const [webhookSource, setWebhookSource] = useState<LeadSource>('whatsapp');
  const [webhookPayload, setWebhookPayload] = useState<string>(
    JSON.stringify(
      {
        name: 'সাকিব আল হাসান',
        phone: '01712998877',
        source: 'whatsapp',
        productInterest: 'প্রিমিয়াম স্পোর্টস জার্সি কম্বো',
        message: 'ভাইয়া, জার্সিগুলোর ফেব্রিক কী? হোম ডেলিভারি পেতে কতদিন লাগবে?',
        tag: 'গরম লিড 🔥',
        estimatedValue: 1800,
      },
      null,
      2
    )
  );
  const [webhookResponse, setWebhookResponse] = useState<{
    status: number;
    success: boolean;
    message: string;
    leadData?: any;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // CSV Import State
  const [csvRawText, setCsvRawText] = useState('');
  const [csvParsedRows, setCsvParsedRows] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<{
    name: string;
    phone: string;
    source: string;
    product: string;
    message: string;
  }>({
    name: '',
    phone: '',
    source: '',
    product: '',
    message: '',
  });
  const [importMergeChoice, setImportMergeChoice] = useState<'merge' | 'skip'>('merge');

  // Handle Webhook test trigger
  const handleTestWebhookIntake = () => {
    try {
      const parsed = JSON.parse(webhookPayload);
      if (!parsed.name || !parsed.phone) {
        setWebhookResponse({
          status: 400,
          success: false,
          message: 'Error: name and phone are required fields in webhook payload.',
        });
        return;
      }

      const result = leadService.addOrMergeLead({
        name: parsed.name,
        phone: parsed.phone,
        source: (parsed.source as LeadSource) || webhookSource,
        productInterest: parsed.productInterest || 'ওয়েবহুক ইনটেক',
        message: parsed.message || 'Webhook থেকে প্রাপ্ত',
        tags: parsed.tag ? [parsed.tag] : ['ওয়েবহুক লিড'],
        estimatedValue: parsed.estimatedValue || 0,
        pageId: parsed.pageId || undefined,
        pageName: parsed.pageName || undefined,
      });

      setWebhookResponse({
        status: 200,
        success: true,
        message: result.notificationMessage,
        leadData: {
          id: result.lead.id,
          name: result.lead.name,
          phone: result.lead.phone,
          sources: result.lead.sources,
          pageName: result.lead.pageName,
          pageId: result.lead.pageId,
          status: result.lead.status,
          isDuplicate: result.isDuplicate,
        },
      });

      onLeadsUpdated();
      onShowToast(result.notificationMessage);
    } catch (err: any) {
      setWebhookResponse({
        status: 400,
        success: false,
        message: 'JSON সিনট্যাক্স ভুল: ' + (err.message || 'Invalid JSON format'),
      });
    }
  };

  // Preset payload generator
  const setPresetPayload = (src: LeadSource) => {
    setWebhookSource(src);
    let sample = {};
    if (src === 'facebook') {
      sample = {
        name: 'রাশেদুল করিম',
        phone: '01822334455',
        source: 'facebook',
        pageName: 'ফ্যাশন কর্নার বিডি',
        pageId: '1092837465',
        productInterest: 'লেদার ওয়ালেট ও বেল্ট প্যাকেজ',
        message: 'Facebook Lead Ad: জেলা: চট্টগ্রাম, কুরিয়ারে ক্যাশ অন ডেলিভারি চাই।',
        tag: 'গরম লিড 🔥',
        estimatedValue: 2100,
      };
    } else if (src === 'messenger') {
      sample = {
        name: 'সাদিকা জাহান',
        phone: '01933445566',
        source: 'messenger',
        pageName: 'সুতি শাড়ি ঘর',
        pageId: '2049182394',
        productInterest: 'সুতি এমব্রয়ডারি থ্রি-পিস',
        message: 'Messenger Chat: জামার বুকের মাপ ও ওড়নার বহর কত ইঞ্চি?',
        tag: 'দাম জানতে চেয়েছে',
        estimatedValue: 2500,
      };
    } else {
      sample = {
        name: 'সাকিব আল হাসান',
        phone: '01712998877',
        source: 'whatsapp',
        productInterest: 'প্রিমিয়াম স্পোর্টস জার্সি কম্বো',
        message: 'WhatsApp Click-to-Chat: ভাইয়া হোম ডেলিভারি পেতে কতদিন লাগবে?',
        tag: 'গরম লিড 🔥',
        estimatedValue: 1800,
      };
    }
    setWebhookPayload(JSON.stringify(sample, null, 2));
    setWebhookResponse(null);
  };

  // CSV File reading
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      parseCSVContent(text);
    };
    reader.readAsText(file);
  };

  const parseCSVContent = (content: string) => {
    setCsvRawText(content);
    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) return;

    const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());
    setCsvHeaders(headers);

    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.replace(/^"|"$/g, '').trim());
      const rowObj: any = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] || '';
      });
      rows.push(rowObj);
    }

    setCsvParsedRows(rows);

    // Auto-map columns if matches exist
    const mapping = { name: '', phone: '', source: '', product: '', message: '' };
    headers.forEach((h) => {
      const lower = h.toLowerCase();
      if (lower.includes('name') || lower.includes('নাম')) mapping.name = h;
      if (lower.includes('phone') || lower.includes('ফোন') || lower.includes('mobile') || lower.includes('নম্বর'))
        mapping.phone = h;
      if (lower.includes('source') || lower.includes('সোর্স') || lower.includes('চ্যানেল'))
        mapping.source = h;
      if (lower.includes('product') || lower.includes('সার্ভিস') || lower.includes('প্রোডাক্ট'))
        mapping.product = h;
      if (lower.includes('message') || lower.includes('মেসেজ') || lower.includes('নোট'))
        mapping.message = h;
    });

    setColumnMapping(mapping);
  };

  // Execute CSV import
  const executeCSVImport = () => {
    if (!columnMapping.name || !columnMapping.phone) {
      alert('অনুগ্রহ করে নাম এবং ফোন নম্বরের কলাম সিলেক্ট করুন।');
      return;
    }

    let addedCount = 0;
    let mergedCount = 0;

    csvParsedRows.forEach((row) => {
      const name = row[columnMapping.name];
      const phone = row[columnMapping.phone];
      if (!name || !phone) return;

      const rawSource = (row[columnMapping.source] || 'manual').toLowerCase();
      let src: LeadSource = 'manual';
      if (rawSource.includes('face') || rawSource.includes('ফেসবুক')) src = 'facebook';
      else if (rawSource.includes('mess') || rawSource.includes('মেসেঞ্জার')) src = 'messenger';
      else if (rawSource.includes('what') || rawSource.includes('হোয়াটসঅ্যাপ')) src = 'whatsapp';

      const normalized = normalizeBdPhoneNumber(phone);
      const existing = leadService.findLeadByPhone(normalized);

      if (existing && importMergeChoice === 'skip') {
        return; // skip duplicate
      }

      const res = leadService.addOrMergeLead({
        name,
        phone,
        source: src,
        productInterest: row[columnMapping.product] || 'CSV ইমপোর্ট',
        message: row[columnMapping.message] || 'CSV থেকে আপলোডকৃত',
      });

      if (res.isDuplicate) mergedCount++;
      else addedCount++;
    });

    onLeadsUpdated();
    onShowToast(`ইমপোর্ট সফল! ${addedCount} টি নতুন লিড যোগ হয়েছে এবং ${mergedCount} টি ডুপ্লিকেট মার্জ হয়েছে।`);
    setCsvParsedRows([]);
    setCsvRawText('');
  };

  const downloadSampleCSV = () => {
    const sample = `নাম,ফোন নম্বর,সোর্স,প্রোডাক্ট,মেসেজ\r\nতানভীর আহমেদ,01711223344,whatsapp,প্রিমিয়াম টি-শার্ট,সাইজ XL আছে?\r\nফারহানা সুলতানা,01819556677,messenger,স্মার্ট ওয়াচ,স্পেসিফিকেশন জানতে চাই\r\nনাজমুল হাসান,01912348899,facebook,লেদার ওয়ালেট,ক্যাশ অন ডেলিভারি হবে?`;
    const blob = new Blob(['\uFEFF' + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lead-import-sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 pt-2 dark:border-slate-800 dark:bg-slate-900 rounded-t-xl">
        <button
          onClick={() => setActiveSubTab('webhook')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition ${
            activeSubTab === 'webhook'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <Webhook className="h-4 w-4" />
          <span>Webhook অটোমেশন (n8n / Zapier / Make)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('csv_import')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition ${
            activeSubTab === 'csv_import'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>CSV ইমপোর্ট ও ম্যাপিং</span>
        </button>

        <button
          onClick={() => setActiveSubTab('export')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition ${
            activeSubTab === 'export'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <Download className="h-4 w-4" />
          <span>ডেটা এক্সপোর্ট</span>
        </button>
      </div>

      {/* 1. WEBHOOK SUB-TAB */}
      {activeSubTab === 'webhook' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Interactive Tester & Payload Simulator */}
          <div className="lg:col-span-7 space-y-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  <Play className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    লাইভ Webhook টেস্ট সিমুলেটর
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    এখানে সরাসরি JSON পাঠিয়ে ইনবক্সে লিড ইনটেক পরীক্ষা করুন
                  </p>
                </div>
              </div>

              {/* Source presets */}
              <div className="flex gap-1">
                <button
                  onClick={() => setPresetPayload('whatsapp')}
                  className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => setPresetPayload('facebook')}
                  className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
                >
                  Facebook
                </button>
                <button
                  onClick={() => setPresetPayload('messenger')}
                  className="rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
                >
                  Messenger
                </button>
              </div>
            </div>

            {/* Simulated Webhook URL Bar */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                CRM Webhook ইনটেক URL (POST রিকোয়েস্ট)
              </label>
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <span className="font-bold text-emerald-600 mr-2">POST</span>
                <span className="flex-1 truncate">https://api.leadpulsebd.com/v1/webhook/leads</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('https://api.leadpulsebd.com/v1/webhook/leads');
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="ml-2 text-slate-400 hover:text-slate-700"
                  title="URL কপি করুন"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* JSON Code Editor Area */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  ইনকামিং JSON পে-লোড বডি
                </label>
                <span className="text-[10px] text-slate-400">স্বয়ংক্রিয় ফোন নম্বর নরমালাইজ ও ডুপ্লিকেট মার্জ</span>
              </div>
              <textarea
                rows={11}
                value={webhookPayload}
                onChange={(e) => setWebhookPayload(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-emerald-400 focus:outline-hidden dark:border-slate-800"
              />
            </div>

            {/* Test Trigger Button */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                ক্লিক করলে সরাসরি ইনবক্সে লিড সংরক্ষিত হবে
              </span>
              <button
                onClick={handleTestWebhookIntake}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>টেস্ট পে-লোড পাঠান</span>
              </button>
            </div>

            {/* Live Webhook Response Card */}
            {webhookResponse && (
              <div
                className={`mt-4 rounded-xl border p-4 text-xs ${
                  webhookResponse.success
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className="flex items-center gap-1.5">
                    {webhookResponse.success ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                    )}
                    <span>HTTP {webhookResponse.status} OK</span>
                  </span>
                  {webhookResponse.leadData?.isDuplicate && (
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] text-purple-800 font-bold dark:bg-purple-900 dark:text-purple-200">
                      ডুপ্লিকেট মার্জ হয়েছে
                    </span>
                  )}
                </div>
                <p className="font-medium">{webhookResponse.message}</p>
                {webhookResponse.leadData && (
                  <pre className="mt-2 rounded-lg bg-black/10 p-2 font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(webhookResponse.leadData, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Right: n8n, Zapier, cURL & Direct Firestore Guides */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Code className="h-4 w-4 text-blue-600" />
                <span>n8n দিয়ে কীভাবে কানেক্ট করবেন?</span>
              </h4>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                n8n-এ আপনার Facebook Lead Ads বা WhatsApp ক্লাউড ট্রিগার নোডের পর একটি <strong>HTTP Request</strong> বা <strong>Google Cloud Firestore</strong> নোড যোগ করুন:
              </p>

              <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 font-mono">
                <div><strong>Method:</strong> POST</div>
                <div><strong>URL:</strong> https://api.leadpulsebd.com/v1/webhook/leads</div>
                <div><strong>Header:</strong> Content-Type: application/json</div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 text-[11px]">
                  <strong>Body Parameters:</strong>
                  <br />
                  name: {`{{ $json.name }}`}
                  <br />
                  phone: {`{{ $json.phone }}`}
                  <br />
                  messengerId: {`{{ $json.messengerId }}`}
                  <br />
                  profileLink: {`{{ $json.profileLink }}`}
                  <br />
                  lastMessage: {`{{ $json.lastMessage }}`}
                  <br />
                  source: whatsapp | facebook | messenger
                </div>
              </div>
            </div>

            {/* n8n Direct Firestore Example JSON Card */}
            <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-5 shadow-2xs dark:border-blue-900/60 dark:bg-blue-950/20">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span>n8n থেকে সরাসরি Firestore লেখার JSON উদাহরণ</span>
                </h4>
                <button
                  onClick={() => {
                    const sampleJson = JSON.stringify({
                      id: "lead-" + Date.now(),
                      name: "সাদিকা জাহান",
                      phone: "01712345678",
                      originalPhone: "+8801712-345678",
                      messengerId: "489218491029482",
                      profileLink: "https://facebook.com/profile.php?id=489218491029482",
                      lastMessage: "জামার বুকের মাপ ও ওড়নার বহর কত ইঞ্চি?",
                      lastMessageAt: new Date().toISOString(),
                      source: "messenger",
                      sources: ["messenger"],
                      productInterest: "সুতি এমব্রয়ডারি থ্রি-পিস",
                      message: "Messenger Chat: জামার বুকের মাপ ও ওড়নার বহর কত ইঞ্চি?",
                      status: "new",
                      tags: ["গরম লিড 🔥", "দাম জানতে চেয়েছে"],
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      nextFollowUpDate: "2026-10-28",
                      assignedTo: "রাহিম আহমেদ",
                      estimatedValue: 2500,
                      isStarred: false,
                      notes: [
                        {
                          id: "note-" + Date.now(),
                          content: "[Messenger গ্রাহক]: জামার বুকের মাপ ও ওড়নার বহর কত ইঞ্চি?",
                          createdAt: new Date().toISOString(),
                          author: "Messenger গ্রাহক"
                        }
                      ],
                      activities: [
                        {
                          id: "act-" + Date.now(),
                          type: "created",
                          description: "Messenger থেকে নতুন লিড ইনবক্সে যুক্ত হয়েছে (Messenger PSID: 489218491029482)।",
                          timestamp: new Date().toISOString()
                        }
                      ]
                    }, null, 2);
                    navigator.clipboard.writeText(sampleJson);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-700 transition flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" />
                  <span>{copiedCode ? 'কপি হয়েছে!' : 'JSON কপি করুন'}</span>
                </button>
              </div>
              <p className="text-[11px] text-blue-800/80 dark:text-blue-200/80 mb-3 leading-relaxed">
                n8n-এ <strong>Google Cloud Firestore</strong> নোড ব্যবহার করে সরাসরি <code>leads</code> কালেকশনে ডকুমেন্ট তৈরি করতে চাইলে নিচের JSON স্ট্রাকচার ব্যবহার করুন:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 font-mono text-[10px] text-emerald-400 max-h-60">
{`{
  "id": "lead-1711234567890",
  "name": "সাদিকা জাহান",
  "phone": "01712345678",
  "originalPhone": "+8801712-345678",
  "messengerId": "489218491029482",
  "profileLink": "https://facebook.com/...",
  "lastMessage": "জামার বুকের মাপ কত ইঞ্চি?",
  "lastMessageAt": "2026-10-25T10:30:00.000Z",
  "source": "messenger",
  "sources": ["messenger"],
  "productInterest": "সুতি থ্রি-পিস",
  "message": "Messenger Chat: জামার বুকের মাপ কত ইঞ্চি?",
  "status": "new",
  "tags": ["গরম লিড 🔥", "দাম জানতে চেয়েছে"],
  "createdAt": "2026-10-25T10:30:00.000Z",
  "updatedAt": "2026-10-25T10:30:00.000Z",
  "nextFollowUpDate": "2026-10-28",
  "assignedTo": "রাহিম আহমেদ",
  "estimatedValue": 2500,
  "isStarred": false,
  "notes": [
    {
      "id": "note-1",
      "content": "প্রথম বার্তা",
      "createdAt": "2026-10-25T10:30:00.000Z",
      "author": "Messenger গ্রাহক"
    }
  ],
  "activities": [
    {
      "id": "act-1",
      "type": "created",
      "description": "Messenger থেকে নতুন লিড ইনবক্সে যুক্ত হয়েছে।",
      "timestamp": "2026-10-25T10:30:00.000Z"
    }
  ]
}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 2. CSV IMPORT SUB-TAB */}
      {activeSubTab === 'csv_import' && (
        <div className="space-y-6 rounded-xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                CSV ফাইল থেকে লিড ইমপোর্ট করুন
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                এক্সেল বা গুগল শিট থেকে ডাউনলোড করা CSV সরাসরি ইনবক্সে আপলোড করুন
              </p>
            </div>

            <button
              onClick={downloadSampleCSV}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Download className="h-3.5 w-3.5" />
              <span>নমুনা CSV ফাইল ডাউনলোড</span>
            </button>
          </div>

          {/* Upload Area */}
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-blue-500 transition-colors dark:border-slate-700">
            <Upload className="h-8 w-8 text-slate-400 mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              CSV ফাইল টেনে এনে এখানে ফেলুন অথবা ব্রাউজ করুন
            </p>
            <p className="text-[11px] text-slate-500 mt-1">UTF-8 ফরম্যাটের CSV ফাইল সমর্থিত</p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="mt-3 text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-700"
            />
          </div>

          {/* Mapping & Preview if file parsed */}
          {csvParsedRows.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200/80 dark:border-slate-800">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                কলাম ম্যাপিং কনফিগারেশন ({csvParsedRows.length} টি সারি পাওয়া গেছে)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    নামের কলাম <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={columnMapping.name}
                    onChange={(e) => setColumnMapping({ ...columnMapping, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="">সিলেক্ট করুন</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    ফোনের কলাম <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={columnMapping.phone}
                    onChange={(e) => setColumnMapping({ ...columnMapping, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="">সিলেক্ট করুন</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    সোর্সের কলাম
                  </label>
                  <select
                    value={columnMapping.source}
                    onChange={(e) => setColumnMapping({ ...columnMapping, source: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="">সিলেক্ট করুন (ডিফল্ট: ম্যানুয়াল)</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    প্রোডাক্টের কলাম
                  </label>
                  <select
                    value={columnMapping.product}
                    onChange={(e) => setColumnMapping({ ...columnMapping, product: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="">সিলেক্ট করুন</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    মেসেজের কলাম
                  </label>
                  <select
                    value={columnMapping.message}
                    onChange={(e) => setColumnMapping({ ...columnMapping, message: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="">সিলেক্ট করুন</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Duplicate Handling Option */}
              <div className="flex items-center gap-4 pt-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  ডুপ্লিকেট ফোন পেলে কী করণীয়?
                </span>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="dupChoice"
                    checked={importMergeChoice === 'merge'}
                    onChange={() => setImportMergeChoice('merge')}
                  />
                  <span>স্বয়ংক্রিয় মার্জ করুন (সুপারিশকৃত)</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="dupChoice"
                    checked={importMergeChoice === 'skip'}
                    onChange={() => setImportMergeChoice('skip')}
                  />
                  <span>উপেক্ষা করুন (স্কিপ)</span>
                </label>
              </div>

              {/* Execute Import CTA */}
              <div className="flex justify-end pt-3">
                <button
                  onClick={executeCSVImport}
                  className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                >
                  ইমপোর্ট সম্পন্ন করুন ({csvParsedRows.length} টি লিড)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. EXPORT SUB-TAB */}
      {activeSubTab === 'export' && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            CSV / Excel ফরম্যাটে এক্সপোর্ট
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
            আপনার সব লিড UTF-8 BOM এনকোডিং সহ CSV ফাইলে ডাউনলোড করতে পারবেন। এতে মাইক্রোসফট এক্সেল বা গুগল শিটে বাংলা ফন্ট পুরোপুরি পরিষ্কার ও অবিকৃতভাবে দেখতে পাবেন।
          </p>

          <div className="pt-2">
            <button
              onClick={() => exportLeadsToCSV(leads, `unified-leads-${new Date().toISOString().split('T')[0]}.csv`)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              <span>বর্তমান সব লিড ডাউনলোড করুন ({leads.length} টি)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
