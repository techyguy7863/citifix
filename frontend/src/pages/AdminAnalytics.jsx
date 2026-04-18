import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout.jsx';
import { adminApi, leaderboardApi } from '@/lib/api.js';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Award,
  Clock,
  CheckCircle,
  BarChart as BarChartIcon,
  TrendingUp
} from 'lucide-react';

const COLORS = ['#ffffff', '#e5e5e5', '#cccccc', '#b3b3b3', '#999999', '#808080'];
const DEPARTMENTS = ['Roads', 'Water', 'Waste', 'Electricity', 'Parks', 'Traffic', 'Other'];

const AdminAnalytics = () => {
  const [complaints, setComplaints] = useState([]);
  const [users, setUsers] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState('all');

  /* -------------------- LOAD & SANITIZE DATA -------------------- */
  useEffect(() => {
    const load = async () => {
      try {
        const complaintsResponse = await adminApi.complaints();
        const leaderboard = await leaderboardApi.list();

        const loadedComplaints = complaintsResponse.complaints || [];
        setComplaints(
          loadedComplaints
            .map((c) => ({ ...c, status: String(c.status || '').toLowerCase() }))
            .filter((c) => c && c.category && c.status && c.createdAt)
        );

        setUsers((leaderboard || []).slice(0, 5));
      } catch {
        setComplaints([]);
        setUsers([]);
      }
    };

    load();
  }, []);

  /* -------------------- FILTERED COMPLAINTS -------------------- */
  const filteredComplaints = useMemo(() => {
    return departmentFilter === 'all'
      ? complaints
      : complaints.filter(c => c.category === departmentFilter);
  }, [complaints, departmentFilter]);

  /* -------------------- STATUS COUNTS -------------------- */
  const statusCounts = useMemo(() => ({
    open: filteredComplaints.filter(c => c.status === 'open').length,
    assigned: filteredComplaints.filter(c => c.status === 'assigned').length,
    resolved: filteredComplaints.filter(c => c.status === 'resolved').length
  }), [filteredComplaints]);

  /* -------------------- TREND DATA (SAFE) -------------------- */
  const trendData = useMemo(() => {
    const map = {};

    filteredComplaints.forEach(c => {
      const dateObj = new Date(c.createdAt);
      if (isNaN(dateObj)) return;

      const date = dateObj.toISOString().split('T')[0];
      map[date] = map[date]
        ? { date, count: map[date].count + 1 }
        : { date, count: 1 };
    });

    return Object.values(map).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [filteredComplaints]);

  /* -------------------- COMPLAINTS BY DEPARTMENT -------------------- */
  const complaintByDept = useMemo(() => {
    return DEPARTMENTS.map(dep => ({
      name: dep,
      count: filteredComplaints.filter(c => c.category === dep).length || 0
    }));
  }, [filteredComplaints]);

  /* -------------------- STATS -------------------- */
  const stats = [
    { icon: Clock, label: 'Open Issues', value: statusCounts.open },
    { icon: BarChartIcon, label: 'Assigned Issues', value: statusCounts.assigned },
    { icon: CheckCircle, label: 'Resolved Issues', value: statusCounts.resolved }
  ];

  return (
    <>
      <Helmet>
        <title>Analytics - CITIFIX</title>
        <meta name="description" content="View real-time analytics for civic issues." />
      </Helmet>

      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">
                  Analytics Dashboard
                </h1>
                <p className="text-white/60 mt-1">Real-time insights and trends</p>
              </div>
            </div>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[220px] bg-white/10 text-white border-white/20 backdrop-blur-sm hover:bg-white/15">
                <SelectValue placeholder="Filter by Department" />
              </SelectTrigger>
              <SelectContent className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl border-white/20 text-white">
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map(dep => (
                  <SelectItem key={dep} value={dep}>
                    {dep}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/10"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">{stat.label}</p>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h3 className="font-bold text-xl text-white mb-4">
                Daily Complaint Trends
              </h3>

              {trendData.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.6)" />
                    <YAxis stroke="rgba(255,255,255,0.6)" />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#ffffff"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h3 className="font-bold text-xl text-white mb-4">Top Citizens</h3>
              <div className="space-y-3">
                {users.map((user, index) => (
                  <div
                    key={user.id}
                    className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/10"
                  >
                    <span className="text-white font-medium">
                      {index + 1}. {user.name}
                    </span>
                    <span className="text-white font-bold flex items-center gap-1">
                      <Award className="w-4 h-4" />
                      {user.rewardPoints || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h3 className="font-bold text-xl text-white mb-4">
                Complaints by Department
              </h3>

              {complaintByDept.some(d => d.count > 0) && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={complaintByDept}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#ffffff" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="lg:col-span-2 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h3 className="font-bold text-xl text-white mb-4">
                Department Distribution
              </h3>

              {complaintByDept.some(d => d.count > 0) && (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={complaintByDept}
                      dataKey="count"
                      nameKey="name"
                      outerRadius={90}
                      label={({ name, percent }) =>
                        percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                      }
                    >
                      {complaintByDept.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
};

export default AdminAnalytics;
