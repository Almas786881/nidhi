import React, { useState, useEffect } from 'react';
import { db } from '@/db/dexie';
import { hashPassword } from '@/db/crypto';
import { auditService } from '@/services/auditService';
import { useAuthStore } from '@/store/authStore';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Modal } from '@/components/common/Modal';
import { UserPlus, Shield, CheckCircle, XCircle, Edit, Building2 } from 'lucide-react';
import type { User, UserRole, Institution } from '@/types';

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'OFFICER' as UserRole,
    institutionId: '',
    department: '',
    designation: '',
    phone: '',
    password: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    const [userList, instList] = await Promise.all([
      db.users.toArray(),
      db.institutions.toArray(),
    ]);
    userList.sort((a, b) => a.name.localeCompare(b.name));
    setUsers(userList);
    setInstitutions(instList);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role: 'OFFICER',
      institutionId: '',
      department: 'Regulation Bureau - Scrutiny Cell',
      designation: 'Assistant Director (Regulation)',
      phone: '',
      password: 'password',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      role: u.role,
      institutionId: u.institutionId || '',
      department: u.department || '',
      designation: u.designation || '',
      phone: u.phone || '',
      password: '',
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (targetUser: User) => {
    if (!currentUser) return;
    if (targetUser.id === currentUser.id) {
      alert('You cannot deactivate your own active session account.');
      return;
    }

    const newState = !targetUser.isActive;
    await db.users.update(targetUser.id, { isActive: newState, updatedAt: new Date().toISOString() });

    await auditService.log({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: newState ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      category: 'ADMIN',
      relatedRecordId: targetUser.id,
      description: `User account ${targetUser.name} (${targetUser.email}) was ${newState ? 'activated' : 'deactivated'}.`,
    });

    loadData();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const now = new Date().toISOString();
    const inst = formData.institutionId
      ? institutions.find(i => i.id === formData.institutionId)
      : undefined;

    if (editingUser) {
      const updates: Partial<User> = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        institutionId: formData.role === 'INSTITUTION' ? formData.institutionId : undefined,
        institutionName: formData.role === 'INSTITUTION' ? inst?.name : undefined,
        department: formData.department,
        designation: formData.designation,
        phone: formData.phone,
        updatedAt: now,
      };

      if (formData.password) {
        updates.passwordHash = await hashPassword(formData.password);
      }

      await db.users.update(editingUser.id, updates);

      await auditService.log({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'USER_UPDATED',
        category: 'ADMIN',
        relatedRecordId: editingUser.id,
        description: `Updated profile & role permissions for ${formData.name} (${formData.role}).`,
      });
    } else {
      const pass = formData.password || 'password';
      const passwordHash = await hashPassword(pass);
      const newId = `USER-${Date.now()}`;

      const newRecord: User = {
        id: newId,
        name: formData.name,
        email: formData.email,
        passwordHash,
        role: formData.role,
        institutionId: formData.role === 'INSTITUTION' ? formData.institutionId : undefined,
        institutionName: formData.role === 'INSTITUTION' ? inst?.name : undefined,
        department: formData.department,
        designation: formData.designation,
        phone: formData.phone,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      await db.users.add(newRecord);

      await auditService.log({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'USER_CREATED',
        category: 'ADMIN',
        relatedRecordId: newId,
        description: `Created new user ${formData.name} with role ${formData.role}.`,
      });
    }

    setIsModalOpen(false);
    loadData();
  };

  const roleBadgeMap: Record<UserRole, string> = {
    ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
    INSTITUTION: 'bg-blue-50 text-blue-700 border-blue-200',
    OFFICER: 'bg-teal-50 text-teal-700 border-teal-200',
    AUTHORITY: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const columns: Column<User>[] = [
    {
      header: 'User Name',
      accessorKey: 'name',
      sortable: true,
      cell: row => (
        <div>
          <div className="font-semibold text-slate-900">{row.name}</div>
          <div className="text-[11px] text-slate-400 font-mono">{row.email}</div>
        </div>
      ),
    },
    {
      header: 'Role',
      accessorKey: 'role',
      sortable: true,
      cell: row => (
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${roleBadgeMap[row.role]}`}>
          {row.role}
        </span>
      ),
    },
    {
      header: 'Department / Institution',
      cell: row => (
        <div className="text-xs">
          {row.institutionName ? (
            <div className="flex items-center gap-1 text-blue-700 font-medium">
              <Building2 className="w-3.5 h-3.5" />
              <span className="truncate max-w-xs">{row.institutionName}</span>
            </div>
          ) : (
            <div className="text-slate-600 font-medium">{row.department || 'Central Headquarters'}</div>
          )}
          {row.designation && <div className="text-slate-400 text-[11px]">{row.designation}</div>}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: row => (
        <span
          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
            row.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}
        >
          {row.isActive ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          {row.isActive ? 'Active' : 'Deactivated'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: row => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1 rounded text-slate-500 hover:text-navy-900 hover:bg-slate-100"
            title="Edit User"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToggleActive(row)}
            className={`text-xs px-2 py-1 rounded font-medium border ${
              row.isActive
                ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            {row.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-navy-950 tracking-tight">User & Access Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Administer role-based authentication, nodal officer logins, and institutional accounts
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-navy-900 text-white hover:bg-navy-800 shadow-sm transition-colors"
        >
          <UserPlus className="w-4 h-4 text-teal-400" />
          <span>Create New User</span>
        </button>
      </div>

      <DataTable
        data={users}
        columns={columns}
        searchPlaceholder="Search by name, email, department or role..."
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit User Credentials & Role' : 'Create System Account'}
        description="All passwords are automatically salted and hashed via Web Crypto SHA-256."
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Dr. Ramesh Chander"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Login ID)</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@nidhi.local"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role Permission</label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none bg-white"
              >
                <option value="ADMIN">System Administrator</option>
                <option value="OFFICER">Regulation Bureau Officer</option>
                <option value="AUTHORITY">Competent Authority</option>
                <option value="INSTITUTION">Institution User</option>
              </select>
            </div>

            {formData.role === 'INSTITUTION' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Affiliated Institution</label>
                <select
                  required
                  value={formData.institutionId}
                  onChange={e => setFormData({ ...formData, institutionId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none bg-white"
                >
                  <option value="">Select Accredited Institution...</option>
                  {institutions.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.code} – {inst.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g. Scrutiny Division"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official Designation</label>
              <input
                type="text"
                value={formData.designation}
                onChange={e => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g. Assistant Director"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {editingUser ? 'New Password (Leave blank to keep existing)' : 'Initial Password'}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? '••••••••' : 'Enter account password'}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-navy-900 hover:bg-navy-800 rounded-lg shadow-sm"
            >
              {editingUser ? 'Update Account' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
