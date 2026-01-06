import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import KPICard from '../components/KPICard'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormField from '../components/FormField'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'new', label: 'New' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
]

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [trainerFilter, setTrainerFilter] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingLeadId, setEditingLeadId] = useState(null)
  const [leadFormData, setLeadFormData] = useState({
    trainer_id: '',
    trainer_contact: '',
    buyer_name: '',
    buyer_contact: '',
    status: 'new',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch leads with trainer info
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select(`
          *,
          trainers (
            name,
            contact
          )
        `)
        .order('created_at', { ascending: false })

      if (leadsError) throw leadsError

      // Fetch trainers for filter
      const { data: trainersData, error: trainersError } = await supabase
        .from('trainers')
        .select('id, name')
        .order('name')

      if (trainersError) throw trainersError

      setLeads(leadsData || [])
      setTrainers(trainersData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    // Status filter
    if (statusFilter !== 'all' && lead.status !== statusFilter) return false

    // Trainer filter
    if (trainerFilter !== 'all' && lead.trainer_id !== trainerFilter) return false

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesTrainer = lead.trainers?.name?.toLowerCase().includes(query)
      const matchesBuyer = lead.buyer_name?.toLowerCase().includes(query)
      const matchesContact = lead.buyer_contact?.toLowerCase().includes(query)
      if (!matchesTrainer && !matchesBuyer && !matchesContact) return false
    }

    return true
  })

  // Calculate KPIs
  const totalLeads = leads.length
  const newLeads = leads.filter(l => l.status === 'new').length
  const convertedLeads = leads.filter(l => l.status === 'converted').length
  const lostLeads = leads.filter(l => l.status === 'lost').length
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0

  const handleEditLead = (lead) => {
    setEditingLeadId(lead.id)
    setLeadFormData({
      trainer_id: lead.trainer_id || '',
      trainer_contact: lead.trainer_contact || lead.trainers?.contact || '',
      buyer_name: lead.buyer_name || '',
      buyer_contact: lead.buyer_contact || '',
      status: lead.status || 'new',
    })
    setIsAddModalOpen(true)
  }

  const handleDeleteLead = async (id) => {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchData()
    } catch (error) {
      console.error('Error deleting lead:', error)
      alert('Error deleting lead: ' + error.message)
    }
  }

  const handleSaveLead = async () => {
    if (!leadFormData.trainer_id) {
      alert('Please select a trainer')
      return
    }

    if (!leadFormData.buyer_name?.trim()) {
      alert('Please enter buyer name')
      return
    }

    try {
      if (editingLeadId) {
        // Update existing lead
        const { error } = await supabase
          .from('leads')
          .update({
            trainer_id: leadFormData.trainer_id,
            trainer_contact: leadFormData.trainer_contact.trim() || null,
            buyer_name: leadFormData.buyer_name.trim(),
            buyer_contact: leadFormData.buyer_contact.trim() || null,
            status: leadFormData.status,
          })
          .eq('id', editingLeadId)

        if (error) throw error
      } else {
        // Insert new lead
        const { error } = await supabase
          .from('leads')
          .insert([{
            trainer_id: leadFormData.trainer_id,
            trainer_contact: leadFormData.trainer_contact.trim() || null,
            buyer_name: leadFormData.buyer_name.trim(),
            buyer_contact: leadFormData.buyer_contact.trim() || null,
            status: leadFormData.status,
          }])

        if (error) throw error
      }

      // Reset form and refresh data
      setLeadFormData({
        trainer_id: '',
        trainer_contact: '',
        buyer_name: '',
        buyer_contact: '',
        status: 'new',
      })
      setEditingLeadId(null)
      setIsAddModalOpen(false)
      await fetchData()
    } catch (error) {
      console.error('Error saving lead:', error)
      alert('Error saving lead: ' + error.message)
    }
  }

  const handleCloseModal = () => {
    setIsAddModalOpen(false)
    setEditingLeadId(null)
    setLeadFormData({
      trainer_id: '',
      trainer_contact: '',
      buyer_name: '',
      buyer_contact: '',
      status: 'new',
    })
  }

  const getStatusBadge = (status) => {
    const styles = {
      new: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      converted: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      lost: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    }
    return (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${styles[status] || styles.new}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    )
  }

  const formatPhoneNumber = (contact) => {
    if (!contact) return null
    // Remove all non-digit characters except + for international numbers
    return contact.replace(/[^\d+]/g, '')
  }

  const handleCall = (contact) => {
    const phoneNumber = formatPhoneNumber(contact)
    if (!phoneNumber) {
      alert('No contact number available for this lead')
      return
    }
    window.location.href = `tel:${phoneNumber}`
  }

  const columns = [
    {
      key: 'trainer_name',
      label: 'Trainer',
      render: (_, row) => (
        <div>
          <p className="font-medium text-white">{row.trainers?.name || 'N/A'}</p>
          <p className="text-xs text-slate-500">{row.trainer_contact || row.trainers?.contact}</p>
        </div>
      ),
    },
    {
      key: 'buyer_name',
      label: 'Buyer',
      render: (value, row) => (
        <div>
          <p className="font-medium text-white">{value || 'N/A'}</p>
          <p className="text-xs text-slate-500">{row.buyer_contact}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => getStatusBadge(value),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (value) => (
        <span className="text-slate-400">
          {value ? new Date(value).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {row.buyer_contact && (
            <button
              onClick={() => handleCall(row.buyer_contact)}
              className="px-3 py-1 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded transition-colors flex items-center gap-1"
              title={`Call ${row.buyer_contact}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call
            </button>
          )}
          <button
            onClick={() => handleEditLead(row)}
            className="px-3 py-1 text-xs bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded transition-colors"
          >
            Edit
          </button>
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Leads Management</h1>
            <p className="text-slate-400">Track and manage buyer leads from trainers</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium rounded-lg shadow-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Lead
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <KPICard
          title="Total Leads"
          value={totalLeads}
          color="indigo"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <KPICard
          title="New Leads"
          value={newLeads}
          color="indigo"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          }
        />
        <KPICard
          title="Converted"
          value={convertedLeads}
          color="emerald"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KPICard
          title="Lost"
          value={lostLeads}
          color="rose"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KPICard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          color="amber"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      </div>

      {/* Conversion Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Conversion Summary</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-slate-800 rounded-full h-4 overflow-hidden">
            <div className="h-full flex">
              <div 
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0}%` }}
              />
              <div 
                className="bg-indigo-500 transition-all duration-500"
                style={{ width: `${totalLeads > 0 ? (newLeads / totalLeads) * 100 : 0}%` }}
              />
              <div 
                className="bg-rose-500 transition-all duration-500"
                style={{ width: `${totalLeads > 0 ? (lostLeads / totalLeads) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
            <span className="text-sm text-slate-400">Converted ({convertedLeads})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
            <span className="text-sm text-slate-400">New ({newLeads})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
            <span className="text-sm text-slate-400">Lost ({lostLeads})</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by trainer, buyer, or contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Trainer Filter */}
          <select
            value={trainerFilter}
            onChange={(e) => setTrainerFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Trainers</option>
            {trainers.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.name}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          {(searchQuery || statusFilter !== 'all' || trainerFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
                setTrainerFilter('all')
              }}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Leads Records</h3>
          <span className="text-sm text-slate-500">
            Showing {filteredLeads.length} of {leads.length} leads
          </span>
        </div>
        <DataTable columns={columns} data={filteredLeads} />
      </div>

      {/* Add/Edit Lead Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        title={editingLeadId ? "Edit Lead" : "Add New Lead"}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSaveLead()
          }}
        >
          <FormField
            label="Trainer"
            type="select"
            value={leadFormData.trainer_id}
            onChange={(value) => {
              const selectedTrainer = trainers.find(t => t.id === value)
              setLeadFormData({
                ...leadFormData,
                trainer_id: value,
                trainer_contact: selectedTrainer?.contact || leadFormData.trainer_contact,
              })
            }}
            options={trainers.map((t) => ({ value: t.id, label: t.name }))}
            required
          />
          <FormField
            label="Trainer Contact"
            value={leadFormData.trainer_contact}
            onChange={(value) => setLeadFormData({ ...leadFormData, trainer_contact: value })}
            placeholder="Enter trainer contact (phone/email)"
          />
          <FormField
            label="Buyer Name"
            value={leadFormData.buyer_name}
            onChange={(value) => setLeadFormData({ ...leadFormData, buyer_name: value })}
            placeholder="Enter buyer name"
            required
          />
          <FormField
            label="Buyer Contact"
            value={leadFormData.buyer_contact}
            onChange={(value) => setLeadFormData({ ...leadFormData, buyer_contact: value })}
            placeholder="Enter buyer contact (phone/email)"
          />
          <FormField
            label="Status"
            type="select"
            value={leadFormData.status}
            onChange={(value) => setLeadFormData({ ...leadFormData, status: value })}
            options={[
              { value: 'new', label: 'New' },
              { value: 'converted', label: 'Converted' },
              { value: 'lost', label: 'Lost' },
            ]}
          />

          <div className="flex gap-3 mt-6">
            {editingLeadId && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
                    await handleDeleteLead(editingLeadId)
                    handleCloseModal()
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors font-medium"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium"
            >
              {editingLeadId ? 'Update' : 'Add'} Lead
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

