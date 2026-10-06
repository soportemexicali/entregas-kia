import React, { useState, useEffect } from 'react';
import { supabase } from "./supabase"; // Ajusta la ruta de tu cliente de Supabase si es necesario

// Lista de respaldo: solo se usa si no se puede leer el catálogo de Supabase
const MODELOS_RESPALDO = [
  "K3 SD", "K3 HB", "K4 SD", "K4 HB", "Niro", 
  "Sonet", "Seltos", "Sportage", "Sportage HEV", "Sorento", "Telluride"
];

const PUNTOS_REVISAR = [
  "Carroceria", "Tapetes Uso Rudo", "Tapetes Tela", "Asientos", 
  "Tablero", "Puertas Interior", "Vidrios", "Pantallas", 
  "Plásticos", "Rines", "Tolvas", "Motor", "Neumáticos"
];

const HORARIOS = ["8:00 a. m.", "12:00 p. m.", "4:00 p. m."];

export default function LimpiezaAutos() {
  const [fechaActual, setFechaActual] = useState(new Date().toISOString().split('T')[0]);
  const [responsable, setResponsable] = useState('');
  const [vinData, setVinData] = useState({});
  const [checksData, setChecksData] = useState({});
  const [commentsData, setCommentsData] = useState({});
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ text: '', type: '' });

  // Catálogo de autos (editable desde el Panel de Administración)
  const [catalogo, setCatalogo] = useState(null); // null = no se pudo leer
  const [catalogoListo, setCatalogoListo] = useState(false);

  useEffect(() => {
    const cargarCatalogo = async () => {
      try {
        const { data, error } = await supabase
          .from('catalogo_autos')
          .select('id, nombre, activo')
          .order('id');
        if (error) throw error;
        setCatalogo(data || []);
      } catch (err) {
        console.error('No se pudo cargar el catálogo, se usa la lista de respaldo:', err);
        setCatalogo(null);
      } finally {
        setCatalogoListo(true);
      }
    };
    cargarCatalogo();
  }, []);

  // Autos "en piso" según el catálogo
  const modelosCatalogo = catalogo
    ? catalogo.filter((a) => a.activo !== false).map((a) => a.nombre)
    : catalogoListo
      ? MODELOS_RESPALDO
      : [];

  // Autos apagados que sí tienen datos guardados en el día seleccionado:
  // se siguen mostrando para no perder información de días anteriores
  const modelosConDatos = new Set();
  Object.entries(vinData).forEach(([modelo, vin]) => {
    if (vin && String(vin).trim()) modelosConDatos.add(modelo);
  });
  Object.entries(checksData).forEach(([key, marcado]) => {
    if (!marcado || !key.startsWith('auto_')) return;
    const resto = key.slice(5);
    const horario = HORARIOS.find((h) => resto.endsWith('_' + h));
    if (horario) modelosConDatos.add(resto.slice(0, -(horario.length + 1)));
  });
  const modelosExtra = [...modelosConDatos].filter((m) => !modelosCatalogo.includes(m));
  const modelosVisibles = [...modelosCatalogo, ...modelosExtra];

  // Cargar datos del día si ya existen
  useEffect(() => {
    fetchRegistroDia(fechaActual);
  }, [fechaActual]);

  const fetchRegistroDia = async (fecha) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('limpieza_diaria')
        .select('*')
        .eq('fecha', fecha)
        .maybeSingle();

      if (data) {
        setResponsable(data.responsable || '');
        setVinData(data.matriz_estado?.vins || {});
        setChecksData(data.matriz_estado?.checks || {});
        setCommentsData(data.matriz_estado?.comments || {});
      } else {
        setResponsable('');
        setVinData({});
        setChecksData({});
        setCommentsData({});
      }
    } catch (err) {
      console.log('No hay registro previo para esta fecha, se iniciará en blanco.');
      setResponsable('');
      setVinData({});
      setChecksData({});
      setCommentsData({});
    } finally {
      setLoading(false);
    }
  };

  const handleVinChange = (modelo, value) => {
    setVinData(prev => ({ ...prev, [modelo]: value }));
  };

  const handleCheckChange = (rowKey, value) => {
    setChecksData(prev => ({
      ...prev,
      [rowKey]: value
    }));
  };

  const handleCommentChange = (punto, value) => {
    setCommentsData(prev => ({
      ...prev,
      [punto]: value
    }));
  };

  const guardarProgreso = async () => {
    setLoading(true);
    setMensaje({ text: '', type: '' });

    try {
      const payload = {
        fecha: fechaActual,
        responsable: responsable || 'Sin registrar',
        matriz_estado: {
          vins: vinData,
          checks: checksData,
          comments: commentsData
        },
        completado: false
      };

      // Verificamos si ya existe un registro para esta fecha
      const { data: existingData, error: selectError } = await supabase
        .from('limpieza_diaria')
        .select('id')
        .eq('fecha', fechaActual)
        .maybeSingle();

      if (selectError) {
        console.error("Error al buscar registro existente:", selectError);
      }

      let error;
      if (existingData?.id) {
        // Si existe, actualizamos usando el ID
        const res = await supabase
          .from('limpieza_diaria')
          .update(payload)
          .eq('id', existingData.id);
        error = res.error;
      } else {
        // Si no existe, insertamos un registro nuevo
        const res = await supabase
          .from('limpieza_diaria')
          .insert([payload]);
        error = res.error;
      }

      if (error) {
        console.error("Detalle completo del error de Supabase:", error);
        throw error;
      }

      setMensaje({ text: '¡Progreso guardado correctamente!', type: 'success' });
    } catch (err) {
      console.error('Error al guardar:', err);
      setMensaje({ text: `Error al guardar: ${err.message || 'Error desconocido'}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const generarPDF = () => {
    window.print();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-white shadow-lg rounded-xl my-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Control Diario - Limpieza de Autos en Piso de Ventas</h2>
        <div className="flex items-center gap-3">
          <label className="font-medium text-gray-700">Fecha:</label>
          <input 
            type="date" 
            value={fechaActual} 
            onChange={(e) => setFechaActual(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <label className="font-medium text-gray-700">Responsable:</label>
        <input 
          type="text" 
          placeholder="Nombre del responsable" 
          value={responsable}
          onChange={(e) => setResponsable(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 w-72 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {mensaje.text && (
        <div className={`p-3 mb-4 rounded-lg text-sm ${mensaje.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {mensaje.text}
        </div>
      )}

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="p-3 border border-slate-700">AUTOS</th>
              <th className="p-3 border border-slate-700">VIN</th>
              {HORARIOS.map((h) => (
                <th key={h} className="p-3 border border-slate-700 text-center">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Sección Autos (viene del catálogo editable) */}
            {modelosVisibles.map((modelo) => (
              <tr key={modelo} className="hover:bg-gray-50">
                <td className="p-3 border border-gray-200 font-semibold">
                  {modelo}
                  {!modelosCatalogo.includes(modelo) && (
                    <span className="block text-[10px] font-normal text-gray-400">
                      Fuera de piso (con registros de este día)
                    </span>
                  )}
                </td>
                <td className="p-3 border border-gray-200">
                  <input 
                    type="text" 
                    placeholder="VIN..."
                    value={vinData[modelo] || ''}
                    onChange={(e) => handleVinChange(modelo, e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 w-full text-xs"
                  />
                </td>
                {HORARIOS.map((horario) => {
                  const key = `auto_${modelo}_${horario}`;
                  return (
                    <td key={horario} className="p-3 border border-gray-200 text-center">
                      <input 
                        type="checkbox"
                        checked={checksData[key] || false}
                        onChange={(e) => handleCheckChange(key, e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}

            {catalogoListo && modelosVisibles.length === 0 && (
              <tr>
                <td colSpan={2 + HORARIOS.length} className="p-4 border border-gray-200 text-center text-gray-400">
                  No hay autos en piso. Actívalos desde el Panel de Administración.
                </td>
              </tr>
            )}

            {/* Separador Puntos a Revisar */}
            <tr className="bg-slate-200 text-slate-800 font-bold text-center">
              <td colSpan={2 + HORARIOS.length} className="p-2 border border-gray-300">Puntos a Revisar y Observaciones</td>
            </tr>

            {/* Sección Puntos a Revisar con Comentarios */}
            {PUNTOS_REVISAR.map((punto) => (
              <tr key={punto} className="hover:bg-gray-50">
                <td colSpan={2} className="p-3 border border-gray-200">
                  <div className="font-medium text-gray-800 mb-1">{punto}</div>
                  <input 
                    type="text"
                    placeholder={`Comentarios u observaciones de ${punto}...`}
                    value={commentsData[punto] || ''}
                    onChange={(e) => handleCommentChange(punto, e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 w-full text-xs text-gray-600 bg-gray-50 focus:bg-white transition"
                  />
                </td>
                {HORARIOS.map((horario) => {
                  const key = `punto_${punto}_${horario}`;
                  return (
                    <td key={horario} className="p-3 border border-gray-200 text-center align-middle">
                      <input 
                        type="checkbox"
                        checked={checksData[key] || false}
                        onChange={(e) => handleCheckChange(key, e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-4 mt-6">
        <button 
          onClick={guardarProgreso}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg shadow transition duration-200 disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Guardar / Actualizar Día'}
        </button>
        <button 
          onClick={generarPDF}
          className="bg-slate-700 hover:bg-slate-800 text-white font-medium px-6 py-2.5 rounded-lg shadow transition duration-200"
        >
          Descargar / Imprimir PDF
        </button>
      </div>
    </div>
  );
}
