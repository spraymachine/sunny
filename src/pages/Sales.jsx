import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import KPICard from '../components/KPICard'
import DataTable from '../components/DataTable'
import AlertBanner from '../components/AlertBanner'
import Modal from '../components/Modal'
import FormField from '../components/FormField'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function Sales() {
  const [sales, setSales] = useState([])
  const [trainers, setTrainers] = useState([])
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState('units_sold')
  const [sortDirection, setSortDirection] = useState('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [trainerFilter, setTrainerFilter] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAddTrainerModalOpen, setIsAddTrainerModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingTrainerId, setEditingTrainerId] = useState(null)
  const [formData, setFormData] = useState({
    trainer_id: '',
    units_assigned: '',
    date_of_assignment: new Date().toISOString().split('T')[0], // Default to today
  })
  const [isDateEditable, setIsDateEditable] = useState(false)
  const [trainerFormData, setTrainerFormData] = useState({
    name: '',
    contact: '',
    notes: '',
    joining_date: new Date().toISOString().split('T')[0], // Default to today
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch trainers
      const { data: trainersData, error: trainersError } = await supabase
        .from('trainers')
        .select('*')
        .order('name')

      if (trainersError) throw trainersError

      // Fetch sales with trainer info
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          trainers (
            name,
            contact
          )
        `)
        .order('created_at', { ascending: false })

      if (salesError) throw salesError

      // Fetch trainer rankings
      const { data: rankingsData, error: rankingsError } = await supabase
        .from('trainer_rankings')
        .select('*')
        .order('rank', { ascending: true })
        .limit(10)

      if (rankingsError) throw rankingsError

      setTrainers(trainersData || [])
      setSales(salesData || [])
      setRankings(rankingsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.trainer_id) {
      alert('Please select a trainer')
      return
    }

    if (!formData.units_assigned || parseInt(formData.units_assigned) <= 0) {
      alert('Please enter units assigned')
      return
    }

    try {
      const selectedTrainer = trainers.find(t => t.id === formData.trainer_id)
      
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('sales')
          .update({
            trainer_id: formData.trainer_id,
            units_assigned: parseInt(formData.units_assigned) || 0,
            units_sold: 0, // Reset to 0 on edit
            date_of_assignment: formData.date_of_assignment,
          })
          .eq('id', editingId)

        if (error) throw error
      } else {
        // Add new
        const { error } = await supabase
          .from('sales')
          .insert([{
            trainer_id: formData.trainer_id,
            units_assigned: parseInt(formData.units_assigned) || 0,
            units_sold: 0,
            date_of_assignment: formData.date_of_assignment,
          }])

        if (error) throw error
      }

      // Reset form and refresh data
      setFormData({
        trainer_id: '',
        units_assigned: '',
        date_of_assignment: new Date().toISOString().split('T')[0],
      })
      setIsDateEditable(false)
      setEditingId(null)
      setIsAddModalOpen(false)
      await fetchData()
    } catch (error) {
      console.error('Error saving sale:', error)
      alert('Error saving sale: ' + error.message)
    }
  }

  const handleEdit = (sale) => {
    setFormData({
      trainer_id: sale.trainer_id,
      units_assigned: sale.units_assigned,
      date_of_assignment: sale.date_of_assignment || sale.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    })
    setIsDateEditable(false)
    setEditingId(sale.id)
    setIsAddModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this sale?')) return

    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error deleting sale:', error)
      alert('Error deleting sale: ' + error.message)
    }
  }

  const handleCloseModal = () => {
    setIsAddModalOpen(false)
    setEditingId(null)
    setIsDateEditable(false)
    setFormData({
      trainer_id: '',
      units_assigned: '',
      date_of_assignment: new Date().toISOString().split('T')[0],
    })
  }

  const handleEditTrainer = (trainer) => {
    setEditingTrainerId(trainer.id)
    // Convert created_at to date string for the input field
    const joiningDate = trainer.created_at 
      ? new Date(trainer.created_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
    setTrainerFormData({
      name: trainer.name || '',
      contact: trainer.contact || '',
      notes: trainer.notes || '',
      joining_date: joiningDate,
    })
    setIsAddTrainerModalOpen(true)
  }

  const handleDeleteTrainer = async (id) => {
    if (!confirm('Are you sure you want to delete this trainer? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('trainers')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchData()
    } catch (error) {
      console.error('Error deleting trainer:', error)
      alert('Error deleting trainer: ' + error.message)
    }
  }

  const handleSaveTrainer = async () => {
    if (!trainerFormData.name.trim()) {
      alert('Please enter a trainer name')
      return
    }

    try {
      // Convert joining_date to timestamp for created_at
      const joiningTimestamp = trainerFormData.joining_date 
        ? new Date(trainerFormData.joining_date).toISOString()
        : new Date().toISOString()

      if (editingTrainerId) {
        // Update existing trainer (including created_at for joining date)
        const { error } = await supabase
          .from('trainers')
          .update({
            name: trainerFormData.name.trim(),
            contact: trainerFormData.contact.trim() || null,
            notes: trainerFormData.notes.trim() || null,
            created_at: joiningTimestamp,
          })
          .eq('id', editingTrainerId)

        if (error) throw error
      } else {
        // Insert new trainer
        const { error } = await supabase
          .from('trainers')
          .insert([{
            name: trainerFormData.name.trim(),
            contact: trainerFormData.contact.trim() || null,
            notes: trainerFormData.notes.trim() || null,
            created_at: joiningTimestamp,
          }])

        if (error) throw error
      }

      // Reset form and refresh data
      setTrainerFormData({
        name: '',
        contact: '',
        notes: '',
        joining_date: new Date().toISOString().split('T')[0],
      })
      setEditingTrainerId(null)
      setIsAddTrainerModalOpen(false)
      await fetchData()
    } catch (error) {
      console.error('Error saving trainer:', error)
      alert('Error saving trainer: ' + error.message)
    }
  }

  const handleCloseTrainerModal = () => {
    setIsAddTrainerModalOpen(false)
    setEditingTrainerId(null)
    setTrainerFormData({
      name: '',
      contact: '',
      notes: '',
      joining_date: new Date().toISOString().split('T')[0],
    })
  }

  const formatPhoneNumber = (contact) => {
    if (!contact) return null
    // Remove all non-digit characters except + for international numbers
    return contact.replace(/[^\d+]/g, '')
  }

  const handleCallTrainer = (contact) => {
    const phoneNumber = formatPhoneNumber(contact)
    if (!phoneNumber) {
      alert('No contact number available for this trainer')
      return
    }
    window.location.href = `tel:${phoneNumber}`
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Calculate total revenue: units_sold * unit_price (assuming ₹100 per unit)
  const UNIT_PRICE = 100

  // Calculate trainer statistics
  const getTrainerStats = (trainerId) => {
    const trainerSales = sales.filter(s => s.trainer_id === trainerId)
    const totalUnits = trainerSales.reduce((sum, s) => sum + (s.units_assigned || 0), 0)
    const totalRevenue = trainerSales.reduce((sum, s) => sum + ((s.units_sold || 0) * UNIT_PRICE), 0)
    return { totalUnits, totalRevenue }
  }

  // Filter sales
  const filteredSales = sales.filter((sale) => {
    // Trainer filter
    if (trainerFilter !== 'all' && sale.trainer_id !== trainerFilter) return false

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesTrainer = sale.trainers?.name?.toLowerCase().includes(query)
      const matchesBuyer = sale.buyer_name?.toLowerCase().includes(query)
      const matchesContact = sale.buyer_contact?.toLowerCase().includes(query)
      if (!matchesTrainer && !matchesBuyer && !matchesContact) return false
    }

    return true
  })

  const sortedSales = [...filteredSales].sort((a, b) => {
    let aVal = a[sortField]
    let bVal = b[sortField]
    
    if (sortField === 'trainer_name') {
      aVal = a.trainers?.name || ''
      bVal = b.trainers?.name || ''
    } else if (sortField === 'revenue') {
      aVal = (a.units_sold || 0) * UNIT_PRICE
      bVal = (b.units_sold || 0) * UNIT_PRICE
    }
    
    if (typeof aVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal)
    }
    
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
  })

  // Calculate KPIs
  const totalUnitsSold = sales.reduce((sum, s) => sum + (s.units_sold || 0), 0)
  const totalUnitsAssigned = sales.reduce((sum, s) => sum + (s.units_assigned || 0), 0)
  const totalRevenue = sales.reduce((sum, s) => sum + ((s.units_sold || 0) * UNIT_PRICE), 0)
  const avgMargin = sales.length > 0 
    ? (sales.reduce((sum, s) => sum + (s.margin_percentage || 0), 0) / sales.length).toFixed(1)
    : 0

  // Check for expiry alerts (within 3 days)
  const today = new Date()
  const expiryAlerts = sales.filter(s => {
    if (!s.expiry_date) return false
    const expiry = new Date(s.expiry_date)
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 3 && s.units_assigned > s.units_sold
  })

  const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return null
    const expiry = new Date(expiryDate)
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
  }

  const columns = [
    {
      key: 'trainer_name',
      label: 'Trainer',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-medium text-white">{row.trainers?.name || 'N/A'}</p>
          <p className="text-xs text-slate-500">{row.trainers?.contact}</p>
        </div>
      ),
    },
    {
      key: 'units_assigned',
      label: 'Units Assigned',
      sortable: true,
      render: (value) => (
        <span className="font-mono">{value || 0}</span>
      ),
    },
    {
      key: 'units_sold',
      label: 'Units Sold',
      sortable: true,
      render: (value, row) => {
        const percentage = row.units_assigned > 0 
          ? ((value / row.units_assigned) * 100).toFixed(0) 
          : 0
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-emerald-400">{value || 0}</span>
            <span className="text-xs text-slate-500">({percentage}%)</span>
          </div>
        )
      },
    },
    {
      key: 'margin_percentage',
      label: 'Margin',
      sortable: true,
      render: (value) => (
        <span className="font-mono">{value || 0}%</span>
      ),
    },
    {
      key: 'revenue',
      label: 'Revenue',
      sortable: true,
      render: (_, row) => {
        const revenue = (row.units_sold || 0) * UNIT_PRICE
        return (
          <span className="font-mono text-emerald-400">₹{revenue.toLocaleString()}</span>
        )
      },
    },
    {
      key: 'expiry_date',
      label: 'Expiry',
      sortable: true,
      render: (value, row) => {
        const days = getDaysUntilExpiry(value)
        const isUrgent = days !== null && days <= 3 && row.units_assigned > row.units_sold
        return (
          <div className="flex items-center gap-2">
            <span className={isUrgent ? 'text-rose-400' : ''}>
              {value ? new Date(value).toLocaleDateString() : 'N/A'}
            </span>
            {isUrgent && (
              <span className="px-2 py-0.5 text-xs bg-rose-500/20 text-rose-400 rounded-full">
                {days}d left
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="px-3 py-1 text-xs bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded transition-colors"
          >
            Edit
          </button>
        </div>
      ),
    },
  ]

  const getRowClassName = (row) => {
    const days = getDaysUntilExpiry(row.expiry_date)
    if (days !== null && days <= 3 && row.units_assigned > row.units_sold) {
      return 'bg-rose-500/5 border-l-2 border-rose-500'
    }
    return ''
  }

  // Chart colors
  const chartColors = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff']

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
            <h1 className="text-2xl font-bold text-white mb-2">Sales Dashboard</h1>
            <p className="text-slate-400">Track bread sales performance and trainer metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddTrainerModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium rounded-lg shadow-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Add Trainer
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium rounded-lg shadow-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Sale
            </button>
          </div>
        </div>
      </div>

      {/* Expiry Alert */}
      {expiryAlerts.length > 0 && (
        <div className="mb-6">
          <AlertBanner
            type="error"
            title={`${expiryAlerts.length} item(s) expiring soon!`}
            message="Items with unsold stock are expiring within 3 days. Take immediate action."
          />
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Total Units Sold"
          value={totalUnitsSold.toLocaleString()}
          subtitle={`of ${totalUnitsAssigned.toLocaleString()} assigned`}
          color="emerald"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <KPICard
          title="Avg Margin"
          value={`${avgMargin}%`}
          color="indigo"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <KPICard
          title="Total Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          color="emerald"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KPICard
          title="Expiry Alerts"
          value={expiryAlerts.length}
          subtitle="items need attention"
          color="rose"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
      </div>

      {/* Charts and Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Trainers Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Trainers by Sales</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankings.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis 
                  type="category" 
                  dataKey="trainer_name" 
                  stroke="#64748b" 
                  fontSize={12}
                  width={100}
                  tickFormatter={(value) => value?.length > 12 ? `${value.slice(0, 12)}...` : value}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="total_units_sold" radius={[0, 4, 4, 0]}>
                  {rankings.slice(0, 5).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rankings Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🏆 Trainer Rankings</h3>
          <div className="space-y-3">
            {rankings.slice(0, 5).map((trainer, index) => (
              <div
                key={trainer.trainer_id}
                className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0 ? 'bg-amber-500 text-black' :
                  index === 1 ? 'bg-slate-400 text-black' :
                  index === 2 ? 'bg-amber-700 text-white' :
                  'bg-slate-700 text-slate-300'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">{trainer.trainer_name}</p>
                  <p className="text-xs text-slate-500">{trainer.trainer_contact}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-emerald-400">{trainer.total_units_sold} sold</p>
                </div>
              </div>
            ))}
            {rankings.length === 0 && (
              <p className="text-slate-500 text-center py-8">No trainer data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Trainers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Trainers</h3>
          <span className="text-sm text-slate-500">
            {trainers.length} trainer{trainers.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Trainer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Joining Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Total Units</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Total Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {trainers.map((trainer) => {
                const stats = getTrainerStats(trainer.id)
                return (
                  <tr key={trainer.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-medium text-white">{trainer.name}</p>
                        <p className="text-xs text-slate-500">{trainer.contact || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-slate-400">
                        {trainer.created_at ? new Date(trainer.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-mono font-semibold text-emerald-400">{stats.totalUnits.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-mono font-semibold text-emerald-400">₹{stats.totalRevenue.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-400 text-sm max-w-md truncate">{trainer.notes || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {trainer.contact && (
                          <button
                            onClick={() => handleCallTrainer(trainer.contact)}
                            className="px-3 py-1 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded transition-colors flex items-center gap-1"
                            title={`Call ${trainer.contact}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            Call
                          </button>
                        )}
                        <button
                          onClick={() => handleEditTrainer(trainer)}
                          className="px-3 py-1 text-xs bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {trainers.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    No trainers found. Click "Add Trainer" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
          {(searchQuery || trainerFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setTrainerFilter('all')
              }}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Sales Records</h3>
          <span className="text-sm text-slate-500">
            Showing {sortedSales.length} of {sales.length} sales
          </span>
        </div>
        <DataTable
          columns={columns}
          data={sortedSales}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          rowClassName={getRowClassName}
        />
      </div>

      {/* Add/Edit Sale Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        title={editingId ? 'Edit Sale' : 'Add New Sale'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSave()
          }}
        >
          <FormField
            label="Trainer"
            type="select"
            value={formData.trainer_id}
            onChange={(value) => setFormData({ ...formData, trainer_id: value })}
            options={trainers.map((t) => ({ value: t.id, label: t.name }))}
            required
          />
          
          {/* Trainer Contact (display only) */}
          {formData.trainer_id && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Trainer Contact
              </label>
              <div className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400">
                {trainers.find(t => t.id === formData.trainer_id)?.contact || 'N/A'}
              </div>
            </div>
          )}

          <FormField
            label="Units Assigned"
            type="number"
            value={formData.units_assigned}
            onChange={(value) => setFormData({ ...formData, units_assigned: value })}
            placeholder="0"
            required
          />

          {/* Date of Assignment with Edit Button */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Date of Assignment
            </label>
            <div className="flex items-center gap-2">
              {isDateEditable ? (
                <>
                  <input
                    type="date"
                    value={formData.date_of_assignment}
                    onChange={(e) => setFormData({ ...formData, date_of_assignment: e.target.value })}
                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setIsDateEditable(false)}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    title="Save date"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300">
                    {formData.date_of_assignment ? new Date(formData.date_of_assignment).toLocaleDateString() : 'N/A'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDateEditable(true)}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                    title="Edit date"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            {editingId && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Are you sure you want to delete this sale?')) {
                    await handleDelete(editingId)
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
              {editingId ? 'Update' : 'Add'} Sale
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Trainer Modal */}
      <Modal
        isOpen={isAddTrainerModalOpen}
        onClose={handleCloseTrainerModal}
        title={editingTrainerId ? "Edit Trainer" : "Add New Trainer"}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSaveTrainer()
          }}
        >
          <FormField
            label="Trainer Name"
            value={trainerFormData.name}
            onChange={(value) => setTrainerFormData({ ...trainerFormData, name: value })}
            placeholder="Enter trainer name"
            required
          />
          <FormField
            label="Contact"
            value={trainerFormData.contact}
            onChange={(value) => setTrainerFormData({ ...trainerFormData, contact: value })}
            placeholder="Enter contact number or email"
          />
          <FormField
            label="Joining Date"
            type="date"
            value={trainerFormData.joining_date}
            onChange={(value) => setTrainerFormData({ ...trainerFormData, joining_date: value })}
          />
          <FormField
            label="Notes"
            type="textarea"
            value={trainerFormData.notes}
            onChange={(value) => setTrainerFormData({ ...trainerFormData, notes: value })}
            placeholder="Enter any additional notes or information about the trainer"
          />

          <div className="flex gap-3 mt-6">
            {editingTrainerId && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Are you sure you want to delete this trainer? This action cannot be undone.')) {
                    await handleDeleteTrainer(editingTrainerId)
                    handleCloseTrainerModal()
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors font-medium"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={handleCloseTrainerModal}
              className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium"
            >
              {editingTrainerId ? 'Update' : 'Add'} Trainer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

