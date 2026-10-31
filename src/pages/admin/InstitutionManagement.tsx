import React, { useState, useEffect } from 'react';
import { db } from '@/db/dexie';
import { auditService } from '@/services/auditService';
import { useAuthStore } from '@/store/authStore';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Modal } from '@/components/common/Modal';
import { PlusCircle, Building2, CheckCircle, XCircle, Edit, MapPin } from 'lucide-react';
import type { Institution } from '@/types';

export const InstitutionManagement: React.FC = () => {
  const { user } = useAuthStore();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInst, setEditingInst] = useState<Institution | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'SELF_FINANCING' as Institution['type'],
    region: 'NORTH' as Institution['region'],
    state: '',
    city: '',
    address: '',
    contactPerson: '',
    email: '',
    phone: '',
    approvalYear: new Date().getFullYear(),
  });

  const loadInstitutions = async () => {
    setIsLoading(true);
    const list = await db.institutions.toArray();
    list.sort((a, b) => a.name.localeCompare(b.name));
    setInstitutions(list);
    setIsLoading(false);
  };

  useEffect(() => {
    loadInstitutions();
  }, []);

  const handleOpenCreate = () => {
    setEditingInst(null);
    setFormData({
      code: `AICTE-INST-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      type: 'SELF_FINANCING',
      region: 'NORTH',
      state: 'Delhi',
      city: '',
      address: '',
      contactPerson: '',
      email: '',
      phone: '',
      approvalYear: 2024,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (inst: Institution) => {
    setEditingInst(inst);
    setFormData({
      code: inst.code,
      name: inst.name,
      type: inst.type,
      region: inst.region,
      state: inst.state,
      city: inst.city,
      address: inst.address,
      contactPerson: inst.contactPerson,
      email: inst.email,
      phone: inst.phone,
      approvalYear: inst.approvalYear,
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (inst: Institution) => {
    if (!user) return;
    const newState = !inst.isActive;
    await db.institutions.update(inst.id, { isActive: newState, updatedAt: new Date().toISOString() });

    await auditService.log({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: newState ? 'INSTITUTION_ACTIVATED' : 'INSTITUTION_DEACTIVATED',
      category: 'ADMIN',
      relatedRecordId: inst.id,
      description: `Institution ${inst.name} (${inst.code}) was ${newState ? 'activated' : 'deactivated'}.`,
    });

    loadInstitutions();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const now = new Date().toISOString();

    if (editingInst) {
      // Update
      await db.institutions.update(editingInst.id, {
        ...formData,
        updatedAt: now,
      });

      await auditService.log({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'INSTITUTION_UPDATED',
        category: 'ADMIN',
        relatedRecordId: editingInst.id,
        description: `Updated institution details for ${formData.name} (${formData.code}).`,
      });
    } else {
      // Create new
      const id = `INST-${Date.now()}`;
      const newRecord: Institution = {
        id,
        ...formData,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      await db.institutions.add(newRecord);

      await auditService.log({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'INSTITUTION_REGISTERED',
        category: 'ADMIN',
        relatedRecordId: id,
        description: `Registered new institution ${formData.name} (${formData.code}) under ${formData.region} region.`,
      });
    }

    setIsModalOpen(false);
    loadInstitutions();
  };

  const columns: Column<Institution>[] = [
    {
      header: 'Code',
      accessorKey: 'code',
      sortable: true,
      className: 'font-mono text-xs font-bold text-navy-900',
    },
    {
      header: 'Institution Name',
      accessorKey: 'name',
      sortable: true,
      cell: row => (
        <div>
          <div className="font-semibold text-slate-900">{row.name}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-slate-400" />
            <span>{row.city}, {row.state} ({row.region})</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Type',
      accessorKey: 'type',
      sortable: true,
      cell: row => (
        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
          {row.type.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      header: 'Contact Person & Email',
      cell: row => (
        <div className="text-xs">
          <div className="font-medium text-slate-800">{row.contactPerson}</div>
          <div className="text-slate-400 font-mono text-[11px]">{row.email}</div>
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
          {row.isActive ? 'Active' : 'Inactive'}
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
            title="Edit Details"
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
          <h1 className="text-2xl font-bold text-navy-950 tracking-tight">Institution Registry</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage AICTE approved technical universities, polytechnics, and engineering colleges
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-navy-900 text-white hover:bg-navy-800 shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4 text-teal-400" />
          <span>Register New Institution</span>
        </button>
      </div>

      <DataTable
        data={institutions}
        columns={columns}
        searchPlaceholder="Search by name, code, state, or email..."
      />

      {/* Modal for Register / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingInst ? 'Edit Institution Record' : 'Register New Institution'}
        description="Ensure the institution code and nodal contact details match AICTE Approval Process records."
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Institution Code</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Approval Year</label>
              <input
                type="number"
                required
                value={formData.approvalYear}
                onChange={e => setFormData({ ...formData, approvalYear: parseInt(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Institution Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. National Institute of Technology & Engineering"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Institution Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none bg-white"
              >
                <option value="GOVERNMENT">Government</option>
                <option value="AIDED">Government Aided</option>
                <option value="SELF_FINANCING">Self Financing / Private</option>
                <option value="DEEMED_UNIVERSITY">Deemed University</option>
                <option value="CENTRAL_INSTITUTION">Central Institution</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">AICTE Region</label>
              <select
                value={formData.region}
                onChange={e => setFormData({ ...formData, region: e.target.value as any })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none bg-white"
              >
                <option value="NORTH">North (Delhi, UP, Punjab, Haryana)</option>
                <option value="SOUTH">South (Karnataka, Tamil Nadu, Kerala)</option>
                <option value="WEST">West (Maharashtra, Gujarat, Goa)</option>
                <option value="EAST">East (WB, Bihar, Odisha, Jharkhand)</option>
                <option value="CENTRAL">Central (MP, Chhattisgarh)</option>
                <option value="NORTH_EAST">North East</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Campus Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Registrar / Nodal Officer Name</label>
              <input
                type="text"
                required
                value={formData.contactPerson}
                onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
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
              {editingInst ? 'Save Changes' : 'Register Institution'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
