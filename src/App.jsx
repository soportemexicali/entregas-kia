import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera,
  X,
  ChevronDown,
  MessageSquare,
  User,
  Send,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

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
// Subcomponente: tarjeta de fotografía
// ---------------------------------------------------------------------------
function PhotoSlot({ label, photo, onSelect, onRemove }) {
  const inputRef = useRef(null)

  const handleChange = (e) => {
    const file = e.target.files?.[0]
    if (file) onSelect(file)
    e.target.value = ''
  }

  return (
    <div className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-white">
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
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-kianavy/80 backdrop-blur text-white flex items-center justify-center active:scale-95 transition"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
          <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent text-white text-xs font-medium px-2.5 py-2">
            {label}
          </span>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="h-full w-full flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-300 rounded-2xl active:bg-slate-50 transition"
        >
          <Camera size={22} className="text-slate-400" strokeWidth={1.75} />
          <span className="text-xs font-medium text-slate-500">{label}</span>
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Subcomponente: fila del checklist
// ---------------------------------------------------------------------------
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
            ${item.checked ? 'bg-kiared border-kiared' : 'border-slate-300 bg-white'}`}
        >
          {item.checked && (
            <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
              <path d="M1 5L4.5 8.5L12 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <span
          className={`flex-1 text-[15px] font-medium ${
            item.checked ? 'text-slate-800' : 'text-slate-600'
          }`}
        >
          {label}
        </span>

        <button
          type="button"
          onClick={onToggleOpen}
          aria-label={`Comentario de ${label}`}
          className={`relative h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition
            ${item.open ? 'bg-kianavy text-white' : 'bg-slate-100 text-slate-400'}`}
        >
          <MessageSquare size={15} strokeWidth={2} />
          {hasComment && !item.open && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-kiared" />
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
            className="w-full text-sm rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-kiared/30 focus:border-kiared/50 resize-none"
          />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function App() {
  const [now, setNow] = useState(new Date())
  const [responsible, setResponsible] = useState('')
  const [photos, setPhotos] = useState({})
  const [checklist, setChecklist] = useState(initialChecklist)
  const [status, setStatus] = useState('idle') // idle | error | saved

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

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
      return { ...prev, [key]: { url: URL.createObjectURL(file), name: file.name } }
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

  const handleSubmit = () => {
    if (!responsible.trim()) {
      setStatus('error')
      return
    }

    const payload = {
      responsable: responsible.trim(),
      fecha: now.toISOString(),
      fotos: Object.fromEntries(Object.entries(photos).map(([k, v]) => [k, v.name])),
      checklist: Object.fromEntries(
        Object.entries(checklist).map(([label, v]) => [label, { checked: v.checked, comment: v.comment }])
      ),
    }
    // Punto de integración: reemplazar por la llamada real a tu API / backend.
    console.log('Revisión de entrega — payload listo para enviar:', payload)

    setStatus('saved')
    setTimeout(() => setStatus('idle'), 3000)
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] font-body pb-28">
      {/* Cabecera */}
      <header className="bg-kianavy text-white px-5 pt-6 pb-5 rounded-b-[28px] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-9 w-14 rounded-md bg-kiared flex items-center justify-center shrink-0">
            <span className="font-display font-extrabold text-[15px] tracking-wide">KIA</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-[19px] leading-tight">
              Puntos a Revisar
            </h1>
            <p className="text-[13px] text-slate-300 -mt-0.5">Auto Entrega</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-kianavy-light/70 px-3.5 py-2.5">
          <span className="text-[13px] text-slate-200 capitalize truncate pr-2">{dateLabel}</span>
          <span className="font-display text-[15px] font-semibold tabular-nums tracking-wide">
            {timeLabel}
          </span>
        </div>
      </header>

      <main className="px-5 mt-5 space-y-6">
        {/* Responsable */}
        <section>
          <label className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 mb-2">
            <User size={14} />
            Responsable / Asesor
          </label>
          <input
            type="text"
            value={responsible}
            onChange={(e) => {
              setResponsible(e.target.value)
              if (status === 'error') setStatus('idle')
            }}
            placeholder="Nombre del asesor"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-kiared/30 focus:border-kiared/50"
          />
        </section>

        {/* Fotografías */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="h-4 w-1 rounded-full bg-kiared" />
            <h2 className="font-display font-semibold text-[15px] text-slate-800">
              Fotografías del vehículo
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
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

        {/* Checklist */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-kiared" />
              <h2 className="font-display font-semibold text-[15px] text-slate-800">
                Lista de puntos a revisar
              </h2>
            </div>
            <span className="text-[13px] font-medium text-slate-500 tabular-nums">
              {checkedCount}/{CHECK_ITEMS.length}
            </span>
          </div>

          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-3">
            <div
              className="h-full bg-kiared transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
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

      {/* Barra de acción fija */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-5 pt-3 bg-gradient-to-t from-[#F4F5F7] via-[#F4F5F7] to-transparent">
        {status === 'error' && (
          <div className="mb-2 flex items-center gap-1.5 text-kiared text-[13px] font-medium px-1">
            <AlertCircle size={14} />
            Completa el nombre del responsable antes de enviar.
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={status === 'saved'}
          className={`w-full h-14 rounded-2xl font-display font-semibold text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-kiared/20 transition active:scale-[0.98]
            ${status === 'saved' ? 'bg-emerald-600 text-white' : 'bg-kiared text-white'}`}
        >
          {status === 'saved' ? (
            <>
              <CheckCircle2 size={19} />
              Revisión guardada
            </>
          ) : (
            <>
              <Send size={17} />
              Guardar / Enviar Revisión
            </>
          )}
        </button>
      </div>
    </div>
  )
}
