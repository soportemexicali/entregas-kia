import React, { useState, useEffect, useMemo } from 'react'
import { Users, Car, Shield, Key, Plus, Trash2, Search, Pencil, Check, X, RefreshCw } from 'lucide-react'
import { supabase } from './supabase'

const ROLES = [
  ['admin', 'Administrador'],
  ['gerente', 'Gerente'],
  ['asesor', 'Asesor de Ventas'],
  ['detallador', 'Detallador'],
]
const ROL_LABEL = Object.fromEntries(ROLES)

const inputCls =
  'w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none bg-white'

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('usuarios')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null) // { type: 'ok' | 'error', text }
  const [myId, setMyId] = useState(null)

  // Usuarios
  const [usuarios, setUsuarios] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [nuevoRol, setNuevoRol] = useState('asesor')
  const [nuevaPassword, setNuevaPassword] = useState('')

  // Autos
  const [autos, setAutos] = useState([])
  const [nuevoAuto, setNuevoAuto] = useState('')
  const [editId, setEditId] = useState(null)
  const [editNombre, setEditNombre] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setMyId(data.session?.user?.id || null))
  }, [])

  useEffect(() => {
    setMsg(null)
    setEditId(null)
    cargarDatos()
  }, [activeTab])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      if (activeTab === 'usuarios') {
        const { data, error } = await supabase.from('profiles').select('*').order('email')
        if (error) throw error
        setUsuarios(data || [])
      } else {
        const { data, error } = await supabase.from('catalogo_autos').select('*').order('id')
        if (error) throw error
        setAutos(data || [])
      }
    } catch (e) {
      console.error('Error al cargar datos:', e)
      setMsg({ type: 'error', text: 'No se pudieron cargar los datos: ' + e.message })
    } finally {
      setLoading(false)
    }
  }

  // Ejecuta una acción, muestra el resultado y recarga la lista
  const ejecutar = async (fn, okText) => {
    setSaving(true)
    setMsg(null)
    try {
      await fn()
      if (okText) setMsg({ type: 'ok', text: okText })
    } catch (e) {
      console.error(e)
      setMsg({ type: 'error', text: e.message || 'Ocurrió un error.' })
    } finally {
      await cargarDatos()
      setSaving(false)
    }
  }

  // Con RLS, un update/delete sin permiso no da error: devuelve 0 filas
  const check = ({ data, error }) => {
    if (error) throw error
    if (!data?.length) throw new Error('Sin permiso para modificar (revisa las políticas RLS).')
  }

  const callAdminFn = async (body) => {
    const { data, error } = await supabase.functions.invoke('admin-users', { body })
    if (error) {
      let m = error.message
      try { m = (await error.context.json()).error || m } catch { /* sin detalle */ }
      throw new Error(m)
    }
    return data
  }

  // ---------------------------- USUARIOS ----------------------------
  const usuariosFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    return t ? usuarios.filter((u) => u.email?.toLowerCase().includes(t)) : usuarios
  }, [usuarios, busqueda])

  const seleccionar = (u) => {
    setSelectedUser(u)
    setNuevoRol(u.role || 'asesor')
    setNuevaPassword('')
    setMsg(null)
  }

  const generarPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
    const arr = new Uint32Array(10)
    crypto.getRandomValues(arr)
    setNuevaPassword(Array.from(arr, (n) => chars[n % chars.length]).join(''))
  }

  const handleUpdateUser = (e) => {
    e.preventDefault()
    if (!selectedUser) return
    const rolCambio = nuevoRol !== selectedUser.role
    const pass = nuevaPassword.trim()

    if (!rolCambio && !pass) return setMsg({ type: 'error', text: 'No hay cambios que guardar.' })
    if (selectedUser.id === myId && nuevoRol !== 'admin')
      return setMsg({ type: 'error', text: 'No puedes quitarte a ti mismo el rol de administrador.' })
    if (pass && pass.length < 8)
      return setMsg({ type: 'error', text: 'La contraseña debe tener mínimo 8 caracteres.' })

    const email = selectedUser.email
    ejecutar(async () => {
      if (rolCambio) {
        check(await supabase.from('profiles').update({ role: nuevoRol }).eq('id', selectedUser.id).select())
      }
      if (pass) await callAdminFn({ action: 'set_password', userId: selectedUser.id, password: pass })
      setSelectedUser(null)
      setNuevaPassword('')
    }, `Cambios guardados para ${email}${pass ? '. Contraseña actualizada.' : '.'}`)
  }

  // ------------------------------ AUTOS ------------------------------
  const enPiso = autos.filter((a) => a.activo !== false).length

  const existeNombre = (nombre, exceptId) =>
    autos.some((a) => a.id !== exceptId && a.nombre.toLowerCase() === nombre.toLowerCase())

  const handleAddAuto = (e) => {
    e.preventDefault()
    const nombre = nuevoAuto.trim()
    if (!nombre) return
    if (existeNombre(nombre)) return setMsg({ type: 'error', text: `"${nombre}" ya está en la lista.` })
    ejecutar(async () => {
      const { error } = await supabase.from('catalogo_autos').insert([{ nombre }])
      if (error) throw error
      setNuevoAuto('')
    }, `"${nombre}" agregado.`)
  }

  const guardarNombre = (auto) => {
    const nombre = editNombre.trim()
    if (!nombre) return
    if (nombre === auto.nombre) return setEditId(null)
    if (existeNombre(nombre, auto.id)) return setMsg({ type: 'error', text: `"${nombre}" ya está en la lista.` })
    ejecutar(async () => {
      check(await supabase.from('catalogo_autos').update({ nombre }).eq('id', auto.id).select())
      setEditId(null)
    }, 'Nombre actualizado.')
  }

  const toggleActivo = (auto) =>
    ejecutar(async () => {
      check(
        await supabase
          .from('catalogo_autos')
          .update({ activo: auto.activo === false })
          .eq('id', auto.id)
          .select()
      )
    })

  const handleDeleteAuto = (auto) => {
    if (!confirm(`¿Eliminar "${auto.nombre}" del panel de limpieza? Si solo no hay unidades en piso, mejor apágalo con el interruptor.`)) return
    ejecutar(async () => {
      check(await supabase.from('catalogo_autos').delete().eq('id', auto.id).select())
    }, `"${auto.nombre}" eliminado.`)
  }

  // ------------------------------- UI -------------------------------
  const tabBtn = (id, Icon, label) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
        activeTab === id ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      <Icon size={15} />
      <span>{label}</span>
    </button>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 text-slate-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="text-red-600" size={24} />
            Panel de Administración • KIA Futura
          </h1>
          <p className="text-xs text-slate-500 mt-1">Gestión de accesos, roles, credenciales y catálogo de vehículos.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          {tabBtn('usuarios', Users, 'Usuarios y Roles')}
          {tabBtn('autos', Car, 'Autos de Limpieza')}
        </div>
      </div>

      {msg && (
        <div
          className={`mb-4 px-4 py-2.5 rounded-xl text-xs font-medium border ${
            msg.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* ===================== USUARIOS Y ROLES ===================== */}
      {activeTab === 'usuarios' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users size={16} className="text-red-600" />
                Colaboradores Registrados
              </h2>
              <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full text-slate-600 font-semibold">
                {usuarios.length}
              </span>
            </div>

            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por correo..."
                className={inputCls + ' pl-9'}
              />
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[420px]">
              {usuariosFiltrados.map((u) => (
                <div
                  key={u.id}
                  onClick={() => seleccionar(u)}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    selectedUser?.id === u.id
                      ? 'border-red-500 bg-red-50/40'
                      : 'border-slate-100 bg-slate-50 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{u.email}</p>
                    <span className="text-[10px] uppercase font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                      {ROL_LABEL[u.role] || u.role || 'Asesor'}
                    </span>
                  </div>
                  <span className="text-xs text-red-600 font-medium shrink-0 ml-2">Editar &rarr;</span>
                </div>
              ))}
              {usuariosFiltrados.length === 0 && !loading && (
                <p className="text-xs text-slate-400 text-center py-8">No se encontraron usuarios.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-fit">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Key size={16} className="text-red-600" />
              Editar Credenciales
            </h2>

            {selectedUser ? (
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Usuario Seleccionado</label>
                  <input type="text" value={selectedUser.email} disabled className={inputCls + ' bg-slate-100 text-slate-600'} />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Asignar Rol</label>
                  <select value={nuevoRol} onChange={(e) => setNuevoRol(e.target.value)} className={inputCls}>
                    {ROLES.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nueva Contraseña (Opcional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Mínimo 8 caracteres"
                      value={nuevaPassword}
                      onChange={(e) => setNuevaPassword(e.target.value)}
                      autoComplete="off"
                      className={inputCls + ' font-mono'}
                    />
                    <button
                      type="button"
                      onClick={generarPassword}
                      title="Generar contraseña automática"
                      className="shrink-0 h-[34px] w-[34px] rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 flex items-center justify-center"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Déjalo en blanco si solo cambias el rol. Cópiala antes de guardar para entregársela al usuario.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium text-xs py-2.5 rounded-xl transition shadow-sm"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </form>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                Selecciona un usuario de la lista para editar su rol o contraseña.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== AUTOS DE LIMPIEZA ===================== */}
      {activeTab === 'autos' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-fit">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Car size={16} className="text-red-600" />
              Dar de Alta Nuevo Auto
            </h2>
            <form onSubmit={handleAddAuto} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Modelo / Versión</label>
                <input
                  type="text"
                  placeholder="Ej: K3 SD, Seltos, Sportage HEV..."
                  value={nuevoAuto}
                  onChange={(e) => setNuevoAuto(e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium text-xs py-2.5 rounded-xl transition shadow-sm flex items-center justify-center gap-2"
              >
                <Plus size={15} />
                <span>Agregar a la Lista</span>
              </button>
            </form>
            <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
              Usa el interruptor de cada auto para apagarlo cuando no haya unidades en piso: deja de aparecer en
              Limpieza pero no pierdes el registro.
            </p>
          </div>

          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Car size={16} className="text-red-600" />
                Catálogo del Panel de Limpieza
              </span>
              <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full text-slate-600 font-semibold">
                {enPiso} en piso / {autos.length} total
              </span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto">
              {autos.map((auto) => {
                const activo = auto.activo !== false
                return (
                  <div
                    key={auto.id}
                    className={`flex items-center gap-2 p-3 rounded-xl border ${
                      activo ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    {editId === auto.id ? (
                      <>
                        <input
                          autoFocus
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') guardarNombre(auto)
                            if (e.key === 'Escape') setEditId(null)
                          }}
                          className={inputCls + ' flex-1 min-w-0'}
                        />
                        <button onClick={() => guardarNombre(auto)} title="Guardar" className="text-emerald-600 p-1">
                          <Check size={16} />
                        </button>
                        <button onClick={() => setEditId(null)} title="Cancelar" className="text-slate-400 p-1">
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate ${activo ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                            {auto.nombre}
                          </p>
                          <p className={`text-[10px] ${activo ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {activo ? 'En piso' : 'Fuera de piso'}
                          </p>
                        </div>
                        <button
                          role="switch"
                          aria-checked={activo}
                          disabled={saving}
                          onClick={() => toggleActivo(auto)}
                          title={activo ? 'Marcar fuera de piso' : 'Marcar en piso'}
                          className={`relative h-5 w-9 shrink-0 rounded-full transition ${activo ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                          <span
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                              activo ? 'left-[18px]' : 'left-0.5'
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => { setEditId(auto.id); setEditNombre(auto.nombre) }}
                          title="Editar nombre"
                          className="text-slate-400 hover:text-slate-700 transition p-1"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteAuto(auto)}
                          title="Eliminar auto"
                          className="text-slate-400 hover:text-red-600 transition p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
              {autos.length === 0 && !loading && (
                <p className="col-span-2 text-center text-xs text-slate-400 py-8">No hay autos dados de alta todavía.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
