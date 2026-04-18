import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { superAdminApi, adminApi } from "@/lib/api";
import { motion } from "framer-motion";
import { Users, ClipboardList, Clock, Search, Shield, ShieldOff, AlertTriangle, CheckCircle, UserPlus, X } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/components/ui/use-toast";

const DEPARTMENTS = [
  { id: 'Roads', label: 'Roads & Transport', icon: '🛣️' },
  { id: 'Water', label: 'Water Supply', icon: '🌊' },
  { id: 'Waste', label: 'Waste Management', icon: '🗑️' },
  { id: 'Electricity', label: 'Electricity', icon: '⚡' },
  { id: 'Parks', label: 'Parks & Recreation', icon: '🌳' },
  { id: 'Traffic', label: 'Traffic & Signals', icon: '🚦' },
  { id: 'Other', label: 'Other Issues', icon: '📋' },
];

const SuperAdminPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");
  
  // Data states
  const [users, setUsers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [slaConfigs, setSlaConfigs] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeDept, setActiveDept] = useState("All");
  const [assignModal, setAssignModal] = useState({ isOpen: false, complaintId: null });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersData, complaintsData, slaData] = await Promise.all([
        superAdminApi.users(),
        adminApi.complaints(),
        superAdminApi.getSlaConfigs()
      ]);
      setUsers(usersData);
      setComplaints(complaintsData.complaints || []);
      
      // Merge SLA configs with defaults
      const mergedSlas = DEPARTMENTS.map(dept => {
        const existing = slaData.find(s => s.department === dept.id);
        return existing || { department: dept.id, daysToResolve: 7, isNew: true };
      });
      setSlaConfigs(mergedSlas);
    } catch (err) {
      toast({ title: "Error fetching data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---

  const handleRoleChange = async (userId, newRole) => {
    try {
      await superAdminApi.setRole(userId, newRole);
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast({ title: "Role updated successfully" });
    } catch (err) {
      toast({ title: "Failed to update role", description: err.message, variant: "destructive" });
    }
  };

  const handleSlaChange = async (department, daysStr) => {
    const days = parseInt(daysStr, 10);
    if (isNaN(days) || days < 1) return;

    try {
      await superAdminApi.setSla(department, days);
      setSlaConfigs(slaConfigs.map(s => s.department === department ? { ...s, daysToResolve: days, isNew: false } : s));
      toast({ title: "SLA updated successfully" });
    } catch (err) {
      toast({ title: "Failed to update SLA", description: err.message, variant: "destructive" });
    }
  };

  const handleAssign = async (subAdminId) => {
    if (!assignModal.complaintId || !subAdminId) return;
    try {
      const updated = await superAdminApi.assignSubAdmin(assignModal.complaintId, subAdminId);
      setComplaints(complaints.map(c => c.id === assignModal.complaintId ? updated : c));
      setAssignModal({ isOpen: false, complaintId: null });
      toast({ title: "Sub-Admin assigned successfully" });
    } catch (err) {
      toast({ title: "Failed to assign", description: err.message, variant: "destructive" });
    }
  };

  const handleUnassign = async (complaintId) => {
    try {
      const updated = await superAdminApi.unassign(complaintId);
      setComplaints(complaints.map(c => c.id === complaintId ? updated : c));
      toast({ title: "Sub-Admin unassigned" });
    } catch (err) {
      toast({ title: "Failed to unassign", description: err.message, variant: "destructive" });
    }
  };

  // --- Render Helpers ---

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.phone.includes(searchTerm)
  );

  const filteredComplaints = complaints.filter(c => 
    (activeDept === "All" || c.category === activeDept) &&
    c.status !== "resolved" // Only show active complaints for assignment
  );

  const subAdmins = users.filter(u => u.role === "SUBADMIN");

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">SuperAdmin Control Center</h1>
        <p className="text-white/60">Manage roles, assign tasks, and configure system SLAs.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
            activeTab === "users" ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          <Users className="w-5 h-5" /> User Management
        </button>
        <button
          onClick={() => setActiveTab("assign")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
            activeTab === "assign" ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          <ClipboardList className="w-5 h-5" /> Assign Complaints
        </button>
        <button
          onClick={() => setActiveTab("sla")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
            activeTab === "sla" ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          <Clock className="w-5 h-5" /> SLA Settings
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>
      ) : (
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6">
          
          {/* TAB 1: USER MANAGEMENT */}
          {activeTab === "users" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">System Users</h2>
                <div className="relative">
                  <Search className="w-5 h-5 text-white/50 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name or phone..."
                    className="bg-white/10 border border-white/20 text-white rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:border-white/40"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50 text-sm">
                      <th className="pb-3 font-medium">Name</th>
                      <th className="pb-3 font-medium">Phone</th>
                      <th className="pb-3 font-medium">Role</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="border-b border-white/5 text-white/90 hover:bg-white/5 transition-colors">
                        <td className="py-4 font-medium">{u.name}</td>
                        <td className="py-4">{u.phone}</td>
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            u.role === 'SUPERADMIN' ? 'bg-purple-500/20 text-purple-400' :
                            u.role === 'SUBADMIN' ? 'bg-amber-500/20 text-amber-400' :
                            u.role === 'ADMIN' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-white/10 text-white/60'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          {u.id !== user.id && u.role !== 'SUPERADMIN' && (
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="bg-black border border-white/20 text-white rounded-lg px-3 py-1 text-sm focus:outline-none"
                            >
                              <option value="CITIZEN">CITIZEN</option>
                              <option value="SUBADMIN">SUBADMIN</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* TAB 2: ASSIGN COMPLAINTS */}
          {activeTab === "assign" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Department Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                <button
                  onClick={() => setActiveDept('All')}
                  className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                    activeDept === 'All' ? 'bg-white text-black shadow-lg' : 'bg-white/10 text-white hover:bg-white/20 border border-white/5'
                  }`}
                >
                  🌐 All Open Issues
                </button>
                {DEPARTMENTS.map(dept => (
                  <button
                    key={dept.id}
                    onClick={() => setActiveDept(dept.id)}
                    className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                      activeDept === dept.id ? 'bg-white text-black shadow-lg' : 'bg-white/10 text-white hover:bg-white/20 border border-white/5'
                    }`}
                  >
                    <span>{dept.icon}</span> {dept.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredComplaints.length === 0 ? (
                  <div className="col-span-full py-10 text-center text-white/50">No open complaints found for this category.</div>
                ) : filteredComplaints.map(c => (
                  <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold px-2 py-1 bg-white/10 rounded text-white/70">#{c.id} • {c.category}</span>
                        {c.status === "assigned" && (
                          <span className="text-amber-400 text-xs font-bold flex items-center gap-1"><Shield className="w-3 h-3"/> ASSIGNED</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-white mb-1 line-clamp-1">{c.title}</h3>
                      <p className="text-sm text-white/50 line-clamp-2 mb-4">{c.description}</p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                      {c.assignedAdminId ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-white/50">Assigned to:</span>
                          <span className="text-sm font-medium text-amber-400">{c.assignedAdmin?.name || "Sub-Admin"}</span>
                          <span className="text-xs text-white/40 mt-1">SLA: {new Date(c.slaDeadline).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-white/40 italic">Unassigned</span>
                      )}

                      <div className="flex gap-2">
                        {c.assignedAdminId ? (
                          <button 
                            onClick={() => handleUnassign(c.id)}
                            className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Unassign"
                          >
                            <ShieldOff className="w-4 h-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => setAssignModal({ isOpen: true, complaintId: c.id })}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-sm font-medium transition-colors"
                          >
                            <UserPlus className="w-4 h-4" /> Assign
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 3: SLA SETTINGS */}
          {activeTab === "sla" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="max-w-2xl">
                <p className="text-white/60 mb-6 text-sm">Set the Service Level Agreement (SLA) deadline for each department. When assigned, the sub-admin will have this many days to resolve the issue before an automated escalation occurs.</p>
                
                <div className="space-y-4">
                  {slaConfigs.map(sla => {
                    const deptInfo = DEPARTMENTS.find(d => d.id === sla.department) || { label: sla.department, icon: '📋' };
                    return (
                      <div key={sla.department} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{deptInfo.icon}</span>
                          <span className="font-medium text-white">{deptInfo.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input 
                            type="number" 
                            min="1"
                            defaultValue={sla.daysToResolve}
                            onBlur={(e) => {
                              if (e.target.value != sla.daysToResolve) {
                                handleSlaChange(sla.department, e.target.value);
                              }
                            }}
                            className="w-20 bg-black border border-white/20 text-white rounded-lg px-3 py-2 text-center focus:outline-none focus:border-emerald-500"
                          />
                          <span className="text-sm text-white/50">days</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

        </div>
      )}

      {/* Assignment Modal */}
      {assignModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="flex justify-between items-center p-5 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">Assign Sub-Admin</h3>
              <button onClick={() => setAssignModal({ isOpen: false, complaintId: null })} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2">
              {subAdmins.length === 0 ? (
                <p className="text-center text-white/50 py-4">No Sub-Admins found. Go to User Management to promote someone.</p>
              ) : subAdmins.map(admin => (
                <button
                  key={admin.id}
                  onClick={() => handleAssign(admin.id)}
                  className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/20 rounded-xl transition-all text-left group"
                >
                  <div>
                    <div className="font-medium text-white group-hover:text-emerald-400 transition-colors">{admin.name}</div>
                    <div className="text-xs text-white/50">{admin.phone}</div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default SuperAdminPanel;
