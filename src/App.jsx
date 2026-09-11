import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera,
  X,
  MessageSquare,
  User,
  Send,
  CheckCircle2,
  AlertCircle,
  Hash,
  History,
  FileText,
  Search,
  ChevronRight,
  ArrowLeft,
  Printer,
  Lock,
  Mail,
  LogOut,
  ExternalLink,
  ShieldCheck
} from 'lucide-react'
import { supabase } from './supabase'

// ---------------------------------------------------------------------------
// Datos fijos del formulario
// ---------------------------------------------------------------------------
const PHOTO_SLOTS = [
  { key: 'frente', label: 'Frente' },
  { key: 'trasera', label: 'Parte trasera' },
  { key: 'interior', label: 'Interior' },
  { key: 'tablero', label: 'Tablero' },
]

const CHECK_ITEMS = [
  'Carrocería',
  'Tapetes uso rudo',
  'Tapetes tela',
  'Asientos',
  'Tablero',
  'Puertas interior',
  'Vidrios',
  'Pantallas',
  'Plásticos',
  'Rines',
  'Tolvas',
  'Motor',
  'Neumáticos',
]

const initialChecklist = () =>
  CHECK_ITEMS.reduce((acc, label) => {
    acc[label] = { checked: false, comment: '', open: false }
    return acc
  }, {})

// ---------------------------------------------------------------------------
// Función auxiliar para comprimir imágenes antes de subir
// ---------------------------------------------------------------------------
const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      return resolve(file)
    }

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file)
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          },
          'image/jpeg',
          quality
        )
      }
    }
    reader.onerror = () => resolve(file)
  })
}

// ---------------------------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------------------------
function PhotoSlot({ label, photo, onSelect, onRemove }) {
  const inputRef = useRef(null)

  const handleChange = (e) => {
    const file = e.target.files?.[0]
    if (file) onSelect(file)
    e.target.value = ''
  }

  return (
    <div className="relative h-24 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm flex flex-col">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />

      {photo ? (
        <>
          <img
            src={photo.url}
            alt={label}
            onClick={() => inputRef.current?.click()}
            className="h-full w-full object-cover cursor-pointer"
          />
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Eliminar foto de ${label}`}
            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-slate-900/85 backdrop-blur text-white flex items-center justify-center active:scale-95 transition"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
          <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[11px] font-medium px-2 py-1 truncate">
            {label}
          </span>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="h-full w-full flex flex-col items-center justify-center gap-1 border-2 border-dashed border-slate-200 rounded-xl active:bg-slate-50 transition p-2"
        >
          <Camera size={18} className="text-slate-400" strokeWidth={1.75} />
          <span className="text-[11px] font-medium text-slate-500 text-center leading-tight">{label}</span>
        </button>
      )}
    </div>
  )
}

function ChecklistRow({ label, item, onToggleCheck, onToggleOpen, onComment }) {
  const hasComment = item.comment.trim().length > 0

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <div className="flex items-center gap-3 py-3">
        <button
          type="button"
          onClick={onToggleCheck}
          aria-pressed={item.checked}
          aria-label={`Marcar ${label}`}
          className={`h-6 w-6 shrink-0 rounded-md border-2 flex items-center justify-center transition
            ${item.checked ? 'bg-slate-700 border-slate-700' : 'border-slate-300 bg-white'}`}
        >
          {item.checked && (
            <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
              <path d="M1 5L4.5 8.5L12 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <span className={`flex-1 text-[15px] font-medium ${item.checked ? 'text-slate-800' : 'text-slate-600'}`}>
          {label}
        </span>

        <button
          type="button"
          onClick={onToggleOpen}
          aria-label={`Comentario de ${label}`}
          className={`relative h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition
            ${item.open ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'}`}
        >
          <MessageSquare size={15} strokeWidth={2} />
          {hasComment && !item.open && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-slate-700" />
          )}
        </button>
      </div>

      {item.open && (
        <div className="pb-3 pl-9 pr-1">
          <textarea
            value={item.comment}
            onChange={(e) => onComment(e.target.value)}
            placeholder="Agregar comentario u observación..."
            rows={2}
            className="w-full text-sm rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/30 resize-none"
          />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente Principal
// ---------------------------------------------------------------------------
export default function App() {
  const [session, setSession] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  
  // Estados de Login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Estados de la Aplicación
  const [activeTab, setActiveTab] = useState('form')
  const [now, setNow] = useState(new Date())
  
  const responsibleRef = useRef(null)
  const clientRef = useRef(null)
  const vinRef = useRef(null)

  const [photos, setPhotos] = useState({})
  const [checklist, setChecklist] = useState(initialChecklist)
  const [status, setStatus] = useState('idle')

  const [inspections, setInspections] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedInspection, setSelectedInspection] = useState(null)

  // Verificar sesión activa de Supabase al cargar
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoadingAuth(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (session && activeTab === 'history') {
      fetchInspections()
    }
  }, [activeTab, session])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })
      if (error) throw error
    } catch (err) {
      setLoginError('Correo o contraseña incorrectos.')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const fetchInspections = async () => {
    setLoadingHistory(true)
    try {
      const { data, error } = await supabase
        .from('inspecciones')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setInspections(data || [])
    } catch (err) {
      console.error('Error al cargar historial:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const filteredInspections = useMemo(() => {
    if (!searchTerm.trim()) return inspections
    const term = searchTerm.toLowerCase()
    return inspections.filter(
      (item) =>
        item.vin?.toLowerCase().includes(term) ||
        item.responsable?.toLowerCase().includes(term) ||
        item.cliente?.toLowerCase().includes(term) ||
        item.created_by?.toLowerCase().includes(term)
    )
  }, [inspections, searchTerm])

  const dateLabel = useMemo(
    () =>
      now.toLocaleDateString('es-MX', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    [now]
  )
  const timeLabel = useMemo(
    () => now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    [now]
  )

  const checkedCount = useMemo(
    () => Object.values(checklist).filter((i) => i.checked).length,
    [checklist]
  )
  const progressPct = Math.round((checkedCount / CHECK_ITEMS.length) * 100)

  const handlePhotoSelect = (key, file) => {
    setPhotos((prev) => {
      if (prev[key]?.url) URL.revokeObjectURL(prev[key].url)
      return { ...prev, [key]: { url: URL.createObjectURL(file), file, name: file.name } }
    })
  }

  const handlePhotoRemove = (key) => {
    setPhotos((prev) => {
      if (prev[key]?.url) URL.revokeObjectURL(prev[key].url)
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const updateItem = (label, patch) =>
    setChecklist((prev) => ({ ...prev, [label]: { ...prev[label], ...patch } }))

  const generateAndPrintPDF = (itemData) => {
    const fechaTexto = new Date(itemData.created_at || itemData.fecha || Date.now()).toLocaleString('es-MX')
    const fotosUrls = itemData.fotos || {}
    const checklistData = itemData.checklist || {}
    const clienteNombre = itemData.cliente || 'Sin Cliente Registrado'
    const creadorPor = itemData.created_by || 'Sistema'

    let checklistRowsHtml = ''
    for (const [item, val] of Object.entries(checklistData)) {
      const isChecked = val?.checked
      const comment = val?.comment || ''
      checklistRowsHtml += `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11pt; color: #1e293b;">${item}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">
            <span style="background-color: ${isChecked ? '#d1fae5' : '#f1f5f9'}; color: ${isChecked ? '#065f46' : '#64748b'}; padding: 4px 10px; border-radius: 6px; font-size: 9pt; font-weight: bold;">
              ${isChecked ? 'REVISADO' : 'PENDIENTE'}
            </span>
          </td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 10pt; color: #64748b; font-style: italic;">
            ${comment ? `"${comment}"` : '-'}
          </td>
        </tr>
      `
    }

    let photosHtml = ''
    for (const [key, url] of Object.entries(fotosUrls)) {
      if (url) {
        photosHtml += `
          <div style="display: inline-block; width: 46%; margin: 2%; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #f8fafc; text-align: center; page-break-inside: avoid; vertical-align: top;">
            <img src="${url}" alt="${key}" style="width: 100%; height: 200px; object-fit: cover; display: block;" />
            <div style="background-color: #0f172a; color: white; font-size: 9pt; font-weight: bold; padding: 6px; text-transform: uppercase;">
              ${key}
            </div>
          </div>
        `
      }
    }

    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Inspección Vehicular - ${itemData.vin}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20pt; font-weight: bold; color: #0f172a; }
          .subtitle { font-size: 10pt; color: #64748b; text-transform: uppercase; margin-top: 2px; }
          .meta-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 25px; }
          .meta-table { width: 100%; border-collapse: collapse; }
          .meta-table td { padding: 4px 0; vertical-align: top; }
          .meta-label { font-size: 9pt; color: #64748b; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 2px; }
          .meta-val { font-size: 11pt; color: #0f172a; font-weight: bold; }
          .audit-footer { margin-top: 25px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 9pt; color: #64748b; text-align: right; }
          h2 { font-size: 14pt; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-top: 30px; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">KIA FUTURA</div>
          <div class="subtitle">Reporte Oficial de Entrega Vehicular</div>
        </div>

        <div class="meta-box">
          <table class="meta-table">
            <tr>
              <td style="width: 34%;">
                <span class="meta-label">Cliente</span>
                <span class="meta-val">${clienteNombre}</span>
              </td>
              <td style="width: 33%;">
                <span class="meta-label">VIN del Vehículo</span>
                <span class="meta-val" style="font-family: monospace;">${itemData.vin}</span>
              </td>
              <td style="width: 33%;">
                <span class="meta-label">Asesor Responsable</span>
                <span class="meta-val">${itemData.responsable}</span>
              </td>
            </tr>
            <tr>
              <td colspan="3" style="padding-top: 10px;">
                <span class="meta-label">Fecha y Hora de Emisión</span>
                <span class="meta-val" style="font-size: 10pt; font-weight: normal;">${fechaTexto}</span>
              </td>
            </tr>
          </table>
        </div>

        <h2>Lista de Puntos Revisados</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <thead>
            <tr style="background-color: #0f172a; color: white;">
              <th style="padding: 10px; text-align: left; font-size: 10pt;">Componente</th>
              <th style="padding: 10px; text-align: center; font-size: 10pt; width: 25%;">Estado</th>
              <th style="padding: 10px; text-align: left; font-size: 10pt; width: 35%;">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            ${checklistRowsHtml}
          </tbody>
        </table>

        <h2>Evidencias Fotográficas</h2>
        <div>
          ${photosHtml || '<p style="color: #64748b; font-style: italic;">Sin fotografías adjuntas.</p>'}
        </div>

        <div class="audit-footer">
          Registro generado en sistema por: <strong>${creadorPor}</strong>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          }
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleSubmit = async () => {
    setStatus('idle')

    const cleanResponsible = (responsibleRef.current?.value || '').trim() || 'Sin Asesor'
    const cleanClient = (clientRef.current?.value || '').trim() || 'Cliente General'
    const cleanVin = (vinRef.current?.value || '').trim() || 'SIN-VIN'
    const currentUserEmail = session?.user?.email || 'Desconocido'

    try {
      setStatus('loading')
      const uploadedPhotos = {}

      for (const [key, photoObj] of Object.entries(photos)) {
        if (photoObj.file) {
          const compressedFile = await compressImage(photoObj.file)
          const fileName = `${cleanVin.toUpperCase()}_${key}_${Date.now()}.jpg`
          
          const { error: uploadError } = await supabase.storage
            .from('evidence-files')
            .upload(fileName, compressedFile)

          if (uploadError) throw uploadError

          const { data: publicUrlData } = supabase.storage
            .from('evidence-files')
            .getPublicUrl(fileName)

          uploadedPhotos[key] = publicUrlData.publicUrl
        }
      }

      const payload = {
        responsable: cleanResponsible,
        cliente: cleanClient,
        vin: cleanVin.toUpperCase(),
        fecha: now.toISOString(),
        fotos: uploadedPhotos,
        checklist: Object.fromEntries(
          Object.entries(checklist).map(([label, v]) => [label, { checked: v.checked, comment: v.comment }])
        ),
        created_by: currentUserEmail, // <--- Aquí guardamos el correo del usuario logueado
      }

      const { data: insertedData, error: dbError } = await supabase
        .from('inspecciones')
        .insert([payload])
        .select()

      if (dbError) throw dbError

      generateAndPrintPDF(insertedData ? insertedData[0] : payload)
      setStatus('saved')
      
      if (responsibleRef.current) responsibleRef.current.value = ''
      if (clientRef.current) clientRef.current.value = ''
      if (vinRef.current) vinRef.current.value = ''

      setTimeout(() => {
        setStatus('idle')
        setPhotos({})
        setChecklist(initialChecklist())
      }, 3000)
    } catch (error) {
      console.error('ERROR AL GUARDAR:', error)
      setStatus('error')
    }
  }

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center font-body text-slate-500">
        Cargando sistema...
      </div>
    )
  }

  // Pantalla de Login si no hay sesión iniciada
  if (!session) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center font-body px-5">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-md">
              <Lock size={22} />
            </div>
            <h1 className="font-display font-bold text-2xl text-slate-900">KIA FUTURA</h1>
            <p className="text-sm text-slate-500">Inicia sesión para acceder al sistema de entregas</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-medium text-center">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Correo electrónico</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="asesor@kiafutura.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contraseña</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/30"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full h-12 bg-slate-900 text-white font-display font-semibold text-sm rounded-xl shadow-lg hover:bg-slate-800 transition active:scale-[0.98]"
            >
              {loginLoading ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Aplicación completa protegida por sesión
  return (
    <div className="min-h-screen bg-[#F4F5F7] font-body pb-32">
      <header className="bg-slate-800 text-white px-5 pt-6 pb-5 rounded-b-[28px] shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 px-3 rounded-md bg-slate-700 flex items-center justify-center shrink-0 border border-slate-600">
              <span className="font-display font-extrabold text-[13px] tracking-wider text-slate-100">KIA FUTURA</span>
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-[19px] leading-tight">
                {activeTab === 'form' ? 'Puntos a Revisar' : 'Historial de Entregas'}
              </h1>
              <p className="text-[13px] text-slate-300 -mt-0.5">Auto Entrega</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-700/60">
              <button
                onClick={() => { setActiveTab('form'); setSelectedInspection(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'form' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Nueva
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                  activeTab === 'history' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <History size={13} />
                Historial
              </button>
            </div>

            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="h-9 w-9 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white hover:bg-rose-900/50 transition"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Indicador visible del usuario logueado en la esquina superior */}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-900/40 px-3.5 py-2 border border-slate-700/50 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 truncate">
            <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
            <span className="truncate">Sesión: <strong className="text-white">{session.user.email}</strong></span>
          </div>
          {activeTab === 'form' && (
            <span className="font-display font-semibold tabular-nums text-slate-300 shrink-0 ml-2">{timeLabel}</span>
          )}
        </div>
      </header>

      {activeTab === 'form' && (
        <main className="px-5 mt-5 space-y-5">
          <div className="space-y-4">
            <section>
              <label className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 mb-2">
                <User size={14} />
                Responsable / Asesor
              </label>
              <input
                ref={responsibleRef}
                type="text"
                placeholder="Nombre del asesor"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/30"
              />
            </section>

            <section>
              <label className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 mb-2">
                <User size={14} />
                Nombre del Cliente
              </label>
              <input
                ref={clientRef}
                type="text"
                placeholder="Nombre completo del cliente"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/30"
              />
            </section>

            <section>
              <label className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 mb-2">
                <Hash size={14} />
                VIN del Vehículo (17 dígitos)
              </label>
              <input
                ref={vinRef}
                type="text"
                onChange={(e) => { e.target.value = e.target.value.toUpperCase() }}
                placeholder="Ej. KNDP3... o VIN de 17 caracteres"
                maxLength={17}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] font-mono tracking-wide text-slate-800 placeholder:text-slate-400 uppercase"
              />
            </section>
          </div>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-4 w-1 rounded-full bg-slate-700" />
              <h2 className="font-display font-semibold text-[15px] text-slate-800">Fotografías del vehículo</h2>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {PHOTO_SLOTS.map((slot) => (
                <PhotoSlot
                  key={slot.key}
                  label={slot.label}
                  photo={photos[slot.key]}
                  onSelect={(file) => handlePhotoSelect(slot.key, file)}
                  onRemove={() => handlePhotoRemove(slot.key)}
                />
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-slate-700" />
                <h2 className="font-display font-semibold text-[15px] text-slate-800">Lista de puntos a revisar</h2>
              </div>
              <span className="text-[13px] font-medium text-slate-500 tabular-nums">
                {checkedCount}/{CHECK_ITEMS.length}
              </span>
            </div>

            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-3">
              <div className="h-full bg-slate-700 transition-all duration-300" style={{ width: `${progressPct}%` }} />
            </div>

            <div className="rounded-2xl bg-white border border-slate-100 px-4">
              {CHECK_ITEMS.map((label) => (
                <ChecklistRow
                  key={label}
                  label={label}
                  item={checklist[label]}
                  onToggleCheck={() => updateItem(label, { checked: !checklist[label].checked })}
                  onToggleOpen={() => updateItem(label, { open: !checklist[label].open })}
                  onComment={(value) => updateItem(label, { comment: value })}
                />
              ))}
            </div>
          </section>
        </main>
      )}

      {activeTab === 'history' && (
        <main className="px-5 mt-5 space-y-4">
          {selectedInspection ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedInspection(null)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm hover:bg-slate-50 transition"
                >
                  <ArrowLeft size={15} />
                  Regresar
                </button>

                <button
                  onClick={() => generateAndPrintPDF(selectedInspection)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-800 px-4 py-2 rounded-xl shadow-sm hover:bg-slate-900 transition active:scale-95"
                >
                  <Printer size={15} />
                  Imprimir / Descargar PDF
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">VIN del Vehículo</span>
                    <h3 className="font-mono font-bold text-lg text-slate-800">{selectedInspection.vin}</h3>
                  </div>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {new Date(selectedInspection.created_at).toLocaleDateString('es-MX')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente</span>
                    <p className="text-sm font-medium text-slate-700">{selectedInspection.cliente || 'No especificado'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Asesor Responsable</span>
                    <p className="text-sm font-medium text-slate-700">{selectedInspection.responsable}</p>
                  </div>
                </div>

                {/* Leyenda pequeña del usuario creador en detalle */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Registrado en sistema por:</span>
                  <strong className="text-slate-700">{selectedInspection.created_by || 'No registrado'}</strong>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Evidencias Fotográficas</span>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedInspection.fotos && Object.entries(selectedInspection.fotos).map(([key, url]) => (
                      <a key={key} href={url} target="_blank" rel="noreferrer" className="block relative h-24 rounded-xl overflow-hidden border border-slate-200 group">
                        <img src={url} alt={key} className="h-full w-full object-cover group-hover:scale-105 transition" />
                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-2 py-0.5 capitalize flex items-center justify-between">
                          {key} <ExternalLink size={10} />
                        </span>
                      </a>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Checklist de Revisión</span>
                  <div className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-100">
                    {selectedInspection.checklist && Object.entries(selectedInspection.checklist).map(([item, val]) => (
                      <div key={item} className="text-xs flex flex-col border-b border-slate-200/60 pb-2 last:border-b-0 last:pb-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-700">{item}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${val.checked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                            {val.checked ? 'REVISADO' : 'PENDIENTE'}
                          </span>
                        </div>
                        {val.comment && (
                          <p className="text-slate-500 mt-1 italic bg-white p-2 rounded border border-slate-100">"{val.comment}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por cliente, VIN, asesor o usuario..."
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/30"
                  />
                </div>
              </div>

              {loadingHistory ? (
                <div className="text-center py-12 text-slate-400 text-sm">Cargando registros...</div>
              ) : filteredInspections.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
                  <FileText size={32} className="mx-auto text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">No se encontraron entregas registradas</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredInspections.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedInspection(item)}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between cursor-pointer hover:border-slate-300 active:scale-[0.99] transition"
                    >
                      <div className="space-y-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-800 truncate">{item.vin}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md truncate max-w-[150px]">
                            {item.created_by || 'Sistema'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 truncate">Cliente: <span className="font-semibold text-slate-800">{item.cliente || 'Sin nombre'}</span></p>
                        <p className="text-xs text-slate-500 truncate">Asesor: <span className="font-medium text-slate-700">{item.responsable}</span></p>
                        <p className="text-[11px] text-slate-400">{new Date(item.created_at).toLocaleString('es-MX')}</p>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      )}

      {activeTab === 'form' && (
        <div className="fixed bottom-0 left-0 right-0 px-5 pb-5 pt-3 bg-gradient-to-t from-[#F4F5F7] via-[#F4F5F7]/95 to-transparent space-y-2 z-50">
          {status === 'error' && (
            <div className="flex items-center justify-center gap-1.5 text-rose-600 text-[13px] font-medium bg-rose-50 border border-rose-200 py-2.5 px-3 rounded-xl shadow-md">
              <AlertCircle size={16} className="shrink-0" />
              Ocurrió un error al guardar o subir las fotos. Revisa la consola.
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={status === 'saved' || status === 'loading'}
            className={`w-full h-14 rounded-2xl font-display font-semibold text-[15px] flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98]
              ${status === 'saved' ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 'bg-slate-800 text-white shadow-slate-800/20 hover:bg-slate-900'}`}
          >
            {status === 'loading' ? (
              <>Guardando y Generando PDF...</>
            ) : status === 'saved' ? (
              <>
                <CheckCircle2 size={19} />
                ¡Guardado y Listo!
              </>
            ) : (
              <>
                <Send size={17} />
                Guardar / Enviar Revisión
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}