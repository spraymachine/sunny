import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import KPICard from '../components/KPICard'
import AlertBanner from '../components/AlertBanner'

export default function CTA() {
  const [alerts, setAlerts] = useState([])
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [trainerFilter, setTrainerFilter] = useState('all')
  const [colorFilter, setColorFilter] = useState('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch expiry alerts view
      const { data: alertsData, error: alertsError } = await supabase
        .from('expiry_alerts')
        .select('*')
        .order('days_until_expiry', { ascending: true })

      if (alertsError) throw alertsError

      // Fetch trainers for filter
      const { data: trainersData, error: trainersError } = await supabase
        .from('trainers')
        .select('id, name')
        .order('name')

      if (trainersError) throw trainersError

      setAlerts(alertsData || [])
      setTrainers(trainersData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate alert status based on days until expiry
  const getAlertStatus = (daysUntilExpiry) => {
    if (daysUntilExpiry <= 1) return 'red'
    if (daysUntilExpiry === 2) return 'yellow'
    return 'green'
  }

  // Filter alerts
  const filteredAlerts = alerts.filter((alert) => {
    // Trainer filter
    if (trainerFilter !== 'all' && alert.trainer_id !== trainerFilter) return false

    // Color filter
    const status = getAlertStatus(alert.days_until_expiry)
    if (colorFilter !== 'all' && status !== colorFilter) return false

    // Date range filter
    if (dateRange.start && new Date(alert.expiry_date) < new Date(dateRange.start)) return false
    if (dateRange.end && new Date(alert.expiry_date) > new Date(dateRange.end)) return false

    return true
  })

  // Calculate KPIs
  const redAlerts = alerts.filter(a => getAlertStatus(a.days_until_expiry) === 'red').length
  const yellowAlerts = alerts.filter(a => getAlertStatus(a.days_until_expiry) === 'yellow').length
  const greenAlerts = alerts.filter(a => getAlertStatus(a.days_until_expiry) === 'green').length
  const totalUnsold = alerts.reduce((sum, a) => sum + (a.unsold_units || 0), 0)

  const getStatusStyles = (status) => {
    switch (status) {
      case 'red':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30',
          badge: 'bg-rose-500',
          text: 'text-rose-400',
          glow: 'shadow-rose-500/20',
        }
      case 'yellow':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30',
          badge: 'bg-amber-500',
          text: 'text-amber-400',
          glow: 'shadow-amber-500/20',
        }
      default:
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30',
          badge: 'bg-emerald-500',
          text: 'text-emerald-400',
          glow: 'shadow-emerald-500/20',
        }
    }
  }

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
        <h1 className="text-2xl font-bold text-white mb-2">CTA Dashboard</h1>
        <p className="text-slate-400">Operations control with traffic light expiry alerts</p>
      </div>

      {/* Critical Alert Banner */}
      {redAlerts > 0 && (
        <div className="mb-6">
          <AlertBanner
            type="error"
            title={`🚨 ${redAlerts} Critical Alert${redAlerts > 1 ? 's' : ''}!`}
            message="Items are expiring within 1 day with unsold stock. Immediate action required!"
          />
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="🔴 Critical (≤1 day)"
          value={redAlerts}
          color="rose"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <KPICard
          title="🟡 Warning (2 days)"
          value={yellowAlerts}
          color="amber"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KPICard
          title="🟢 Safe (>3 days)"
          value={greenAlerts}
          color="emerald"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KPICard
          title="Total Unsold Units"
          value={totalUnsold.toLocaleString()}
          color="indigo"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
      </div>

      {/* Traffic Light Legend */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Traffic Light System</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <div className="w-8 h-8 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50 animate-pulse"></div>
            <div>
              <p className="font-semibold text-emerald-400">Green - Safe</p>
              <p className="text-sm text-slate-400">More than 3 days remaining</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="w-8 h-8 bg-amber-500 rounded-full shadow-lg shadow-amber-500/50 animate-pulse"></div>
            <div>
              <p className="font-semibold text-amber-400">Yellow - Warning</p>
              <p className="text-sm text-slate-400">2 days remaining</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg">
            <div className="w-8 h-8 bg-rose-500 rounded-full shadow-lg shadow-rose-500/50 animate-pulse"></div>
            <div>
              <p className="font-semibold text-rose-400">Red - Critical</p>
              <p className="text-sm text-slate-400">1 day or less remaining</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
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

          {/* Color Filter */}
          <select
            value={colorFilter}
            onChange={(e) => setColorFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="red">🔴 Critical</option>
            <option value="yellow">🟡 Warning</option>
            <option value="green">🟢 Safe</option>
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">From:</span>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">To:</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Clear Filters */}
          {(trainerFilter !== 'all' || colorFilter !== 'all' || dateRange.start || dateRange.end) && (
            <button
              onClick={() => {
                setTrainerFilter('all')
                setColorFilter('all')
                setDateRange({ start: '', end: '' })
              }}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAlerts.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-500">No alerts matching your filters</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const status = getAlertStatus(alert.days_until_expiry)
            const styles = getStatusStyles(status)
            
            return (
              <div
                key={alert.sale_id}
                className={`${styles.bg} border rounded-xl p-5 shadow-lg ${styles.glow} transition-all duration-300 hover:scale-[1.02]`}
              >
                {/* Traffic Light Indicator */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 ${styles.badge} rounded-full shadow-lg animate-pulse`}></div>
                    <span className={`text-sm font-semibold uppercase tracking-wide ${styles.text}`}>
                      {status === 'red' ? 'Critical' : status === 'yellow' ? 'Warning' : 'Safe'}
                    </span>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${styles.badge} text-white`}>
                    {alert.days_until_expiry <= 0 ? 'EXPIRED' : `${alert.days_until_expiry}d left`}
                  </span>
                </div>

                {/* Trainer Info */}
                <div className="mb-4">
                  <p className="font-semibold text-white text-lg">{alert.trainer_name}</p>
                  <p className="text-sm text-slate-400">{alert.trainer_contact}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Assigned</p>
                    <p className="text-xl font-bold text-white">{alert.units_assigned}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Unsold</p>
                    <p className={`text-xl font-bold ${styles.text}`}>{alert.unsold_units}</p>
                  </div>
                </div>

                {/* Expiry Date */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                  <span className="text-sm text-slate-400">Expiry Date</span>
                  <span className={`text-sm font-medium ${styles.text}`}>
                    {new Date(alert.expiry_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {/* Buyer Info */}
                {alert.buyer_name && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <p className="text-xs text-slate-500">Buyer: {alert.buyer_name}</p>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

