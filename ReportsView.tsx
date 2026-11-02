import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { Lead } from '../../types/lead';
import { SummaryStats } from '../../services/leadService';
import {
  toBengaliNumerals,
  formatTaka,
  SOURCE_LABELS,
  STATUS_LABELS,
} from '../../utils/formatters';
import { TrendingUp, Award, Clock, Users, ExternalLink } from 'lucide-react';

interface ReportsViewProps {
  leads: Lead[];
  stats: SummaryStats;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ leads, stats }) => {
  // 1. Source Data for Pie Chart
  const sourceData = [
    { name: 'Facebook', value: stats.facebookCount, color: '#1877F2' },
    { name: 'Messenger', value: stats.messengerCount, color: '#0084FF' },
    { name: 'WhatsApp', value: stats.whatsappCount, color: '#25D366' },
    { name: 'ম্যানুয়াল', value: stats.manualCount, color: '#64748B' },
  ].filter((item) => item.value > 0);

  // 2. Status Funnel Data for Bar Chart
  const statusCounts = {
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    followup: leads.filter((l) => l.status === 'followup').length,
    won: leads.filter((l) => l.status === 'won').length,
    lost: leads.filter((l) => l.status === 'lost').length,
  };

  const statusData = [
    { name: 'নতুন', count: statusCounts.new, fill: '#3B82F6' },
    { name: 'যোগাযোগ', count: statusCounts.contacted, fill: '#8B5CF6' },
    { name: 'ফলো-আপ', count: statusCounts.followup, fill: '#F59E0B' },
    { name: 'কাস্টমার 🎉', count: statusCounts.won, fill: '#10B981' },
    { name: 'হারানো', count: statusCounts.lost, fill: '#94A3B8' },
  ];

  // 3. Daily Lead intake grouping
  const dateMap: Record<string, number> = {};
  leads.forEach((l) => {
    const d = l.createdAt.split('T')[0];
    dateMap[d] = (dateMap[d] || 0) + 1;
  });

  const dailyTrendData = Object.keys(dateMap)
    .sort()
    .slice(-7)
    .map((dateStr) => {
      const parts = dateStr.split('-');
      const formattedDate = `${toBengaliNumerals(parts[2])}/${toBengaliNumerals(parts[1])}`;
      return {
        date: formattedDate,
        leads: dateMap[dateStr],
      };
    });

  // Calculate Conversion Rate
  const conversionRate =
    leads.length > 0 ? Math.round((statusCounts.won / leads.length) * 100) : 0;

  // 4. Post Grouping
  const postMap: Record<string, { count: number; link?: string }> = {};
  leads.forEach((l) => {
    if (l.lastPostId) {
      if (!postMap[l.lastPostId]) {
        postMap[l.lastPostId] = { count: 0, link: l.lastPostLink };
      }
      postMap[l.lastPostId].count++;
      if (l.lastPostLink && !postMap[l.lastPostId].link) {
        postMap[l.lastPostId].link = l.lastPostLink;
      }
    }
  });
  const postReportData = Object.entries(postMap).map(([postId, data]) => ({
    postId,
    count: data.count,
    link: data.link,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-700/80 dark:bg-[#1e293b]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">কনভার্সন রেট</span>
            <Award className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {toBengaliNumerals(conversionRate)}%
          </div>
          <p className="mt-1 text-[11px] text-slate-500">মোট লিডের কাস্টমারে রূপান্তর</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-700/80 dark:bg-[#1e293b]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">সফল কাস্টমার</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {toBengaliNumerals(statusCounts.won)} জন
          </div>
          <p className="mt-1 text-[11px] text-slate-500">অর্ডার সম্পন্নকারী ক্রেতা</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-700/80 dark:bg-[#1e293b]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">সেলস পাইপলাইন ভ্যালু</span>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {formatTaka(stats.totalEstimatedPipelineValue)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">সম্ভাব্য অর্ডারের সর্বমোট পরিমাণ</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-700/80 dark:bg-[#1e293b]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">আজকের ফলো-আপ</span>
            <Clock className="h-4 w-4 text-violet-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-violet-600 dark:text-violet-400 tabular-nums">
            {toBengaliNumerals(stats.todayFollowUpCount)} টি
          </div>
          <p className="mt-1 text-[11px] text-slate-500">যোগাযোগের অপেক্ষায় আছে</p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Source Distribution Pie Chart */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-700/80 dark:bg-[#1e293b]">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            প্ল্যাটফর্ম ভিত্তিক লিডের অনুপাত
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Facebook, Messenger ও WhatsApp থেকে আসা লিডের অংশ
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${toBengaliNumerals(value)} টি লিড`, 'সংখ্যা']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Stage Bar Chart */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-700/80 dark:bg-[#1e293b]">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            সেলস ফানেল ও পাইপলাইন পর্যায়
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            প্রতিটি স্ট্যাটাসে বর্তমান লিডের বিন্যাস
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(val: any) => [`${toBengaliNumerals(val)} টি`, 'লিড সংখ্যা']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Daily Lead Intake Trend */}
      {dailyTrendData.length > 0 && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-700/80 dark:bg-[#1e293b]">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            দৈনিক নতুন লিড আগমনের ধারা (বিগত দিনগুলো)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            তারিখ অনুসারে লিড আসার গ্রাফ
          </p>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(val: any) => [`${toBengaliNumerals(val)} টি`, 'লিড']} />
                <Line
                  type="monotone"
                  dataKey="leads"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3B82F6' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Leads by Post Table */}
      {postReportData.length > 0 && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-700/80 dark:bg-[#1e293b]">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            পোস্ট অনুযায়ী লিড
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            কোন ফেসবুক পোস্ট থেকে কতটি কমেন্ট লিড এসেছে তার বিবরণ
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500">
                  <th className="py-2.5 px-3">পোস্ট আইডি</th>
                  <th className="py-2.5 px-3">লিডের সংখ্যা</th>
                  <th className="py-2.5 px-3 text-right">পোস্ট দেখুন লিংক</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {postReportData.map((item) => (
                  <tr key={item.postId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 font-mono text-slate-800 dark:text-slate-200">
                      {item.postId}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                      {toBengaliNumerals(item.count)} টি
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {item.link ? (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          <span>পোস্ট দেখুন</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">লিংক নেই</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
