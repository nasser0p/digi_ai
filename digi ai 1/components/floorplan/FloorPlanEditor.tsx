import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { FloorPlan, FloorPlanTable, RestaurantProfile } from '../../types';
import { useTranslation, LanguageProvider } from '../../contexts/LanguageContext';
import TableElement from './TableElement';
import EditorPropertiesPanel from './EditorPropertiesPanel';
import PrintableQrLayout from './PrintableQrLayout';

interface FloorPlanEditorProps {
    planToEdit: FloorPlan;
    onSaveLayout: (plan: FloorPlan) => Promise<void>;
    profile: RestaurantProfile | null;
}

const DRAG_THRESHOLD = 5; // pixels

const FloorPlanEditor: React.FC<FloorPlanEditorProps> = ({ planToEdit, onSaveLayout, profile }) => {
    const { t } = useTranslation();
    const [plan, setPlan] = useState<FloorPlan>(planToEdit);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [placingMode, setPlacingMode] = useState<'square' | 'round' | null>(null);

    // Drag state
    const dragState = useRef<{
        isDragging: boolean;
        draggedTableId: string | null;
        startX: number;
        startY: number;
        originalTableX: number;
        originalTableY: number;
    }>({
        isDragging: false,
        draggedTableId: null,
        startX: 0,
        startY: 0,
        originalTableX: 0,
        originalTableY: 0,
    });
    const [ghostTable, setGhostTable] = useState<(FloorPlanTable & { hasCollision: boolean }) | null>(null);
    const ghostTableRef = useRef<(FloorPlanTable & { hasCollision: boolean }) | null>(null);
    
    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setPlan(planToEdit);
    }, [planToEdit]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setPlacingMode(null);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const handleGridSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const size = Math.max(5, parseInt(value, 10)) || 10;
        setPlan(p => ({ ...p, [name]: size }));
    };

    const handleSaveLayout = async () => {
        setSaving(true);
        setMessage('');
        try {
            await onSaveLayout(plan);
            setMessage(t('floor_plan_table_saved'));
            setTimeout(() => setMessage(''), 2000);
        } catch (error) {
            console.error(error);
            setMessage(t('floor_plan_table_error'));
        } finally {
            setSaving(false);
        }
    };
    
    const updateTable = (tableId: string, updates: Partial<FloorPlanTable>) => {
        setPlan(p => ({
            ...p,
            tables: p.tables.map(t => t.id === tableId ? { ...t, ...updates } : t)
        }));
    };
    
    const deleteTable = (tableId: string) => {
        setPlan(p => ({
            ...p,
            tables: p.tables.filter(t => t.id !== tableId)
        }));
        setSelectedTableId(null);
    };

    const handleClearLayout = () => {
        if(window.confirm(t('floor_plan_clear_confirm'))) {
            setPlan(p => ({ ...p, tables: [] }));
            setSelectedTableId(null);
        }
    };
    
    const handlePrintAllQRs = () => {
        const printContainer = document.getElementById('printable-qr-layout');
        if (printContainer) {
            const root = createRoot(printContainer);
            root.render(
                <React.StrictMode>
                    <LanguageProvider>
                        <PrintableQrLayout plan={plan} profile={profile} />
                    </LanguageProvider>
                </React.StrictMode>
            );
            setTimeout(() => {
                window.print();
                root.unmount();
            }, 200);
        }
    };
    
    const handlePointerDown = (e: React.PointerEvent, table: FloorPlanTable) => {
        if (placingMode) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);

        dragState.current = {
            isDragging: false,
            draggedTableId: table.id,
            startX: e.clientX,
            startY: e.clientY,
            originalTableX: table.x,
            originalTableY: table.y,
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    const handlePointerMove = (e: PointerEvent) => {
        const { draggedTableId, startX, startY, isDragging, originalTableX, originalTableY } = dragState.current;
        if (!draggedTableId) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (!isDragging && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
            dragState.current.isDragging = true;
            setSelectedTableId(null);
        }
        
        if (dragState.current.isDragging) {
            if (!gridRef.current) return;
            const gridRect = gridRef.current.getBoundingClientRect();
            const cellWidth = gridRect.width / plan.gridWidth;
            const cellHeight = gridRect.height / plan.gridHeight;
            
            const table = plan.tables.find(t => t.id === draggedTableId);
            if (!table) return;

            const newPixelX = (originalTableX - 1) * cellWidth + dx + (table.width * cellWidth / 2);
            const newPixelY = (originalTableY - 1) * cellHeight + dy + (table.height * cellHeight / 2);
            
            const col = Math.floor(newPixelX / cellWidth);
            const row = Math.floor(newPixelY / cellHeight);

            const newX = Math.max(1, Math.min(col + 1, plan.gridWidth - table.width + 1));
            const newY = Math.max(1, Math.min(row + 1, plan.gridHeight - table.height + 1));

            const hasCollision = plan.tables.some(t => {
                if (t.id === table.id) return false;
                return (
                    newX < t.x + t.width &&
                    newX + table.width > t.x &&
                    newY < t.y + t.height &&
                    newY + table.height > t.y
                );
            });

            const newGhostTable = { ...table, x: newX, y: newY, hasCollision };
            setGhostTable(newGhostTable);
            ghostTableRef.current = newGhostTable;
        }
    };

    const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        
        const { isDragging, draggedTableId } = dragState.current;
        const finalGhostTable = ghostTableRef.current;

        if (!isDragging) { // Tap
            setSelectedTableId(draggedTableId);
        } else { // Drag
            if (finalGhostTable && !finalGhostTable.hasCollision) {
                updateTable(finalGhostTable.id, { x: finalGhostTable.x, y: finalGhostTable.y });
            }
        }
        
        dragState.current = { isDragging: false, draggedTableId: null, startX: 0, startY: 0, originalTableX: 0, originalTableY: 0 };
        setGhostTable(null);
        ghostTableRef.current = null;
    };

    const handleGridClick = (e: React.MouseEvent) => {
        if (e.target !== gridRef.current) return;

        if (placingMode) {
            if (!gridRef.current) return;

            const gridRect = gridRef.current.getBoundingClientRect();
            const cellWidth = gridRect.width / plan.gridWidth;
            const cellHeight = gridRect.height / plan.gridHeight;

            const col = Math.floor((e.clientX - gridRect.left) / cellWidth);
            const row = Math.floor((e.clientY - gridRect.top) / cellHeight);

            const newTable: Omit<FloorPlanTable, 'id' | 'label'> = {
                shape: placingMode,
                x: col + 1,
                y: row + 1,
                width: 2,
                height: 2,
                rotation: 0
            };

            const isOccupied = plan.tables.some(t => 
                newTable.x < t.x + t.width &&
                newTable.x + newTable.width > t.x &&
                newTable.y < t.y + t.height &&
                newTable.y + newTable.height > t.y
            );
            
            if (!isOccupied) {
                 const newFullTable: FloorPlanTable = {
                    ...newTable,
                    id: `table_${Date.now()}`,
                    label: `T${plan.tables.length + 1}`,
                };
                setPlan(p => ({ ...p, tables: [...p.tables, newFullTable] }));
            }
        } else {
            setSelectedTableId(null);
        }
    };
    
    const selectedTable = plan.tables.find(t => t.id === selectedTableId);

    const ToolboxButton = ({ shape, label }: { shape: 'square' | 'round', label: string }) => (
        <div 
            onClick={() => setPlacingMode(prev => prev === shape ? null : shape)}
            className={`flex items-center gap-2 p-2 border dark:border-brand-gray-700 rounded-md cursor-pointer transition-all ${placingMode === shape ? 'bg-brand-teal/20 ring-2 ring-brand-teal' : 'hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700'}`}
        >
            <div className={`w-8 h-8 bg-brand-gray-300 dark:bg-brand-gray-600 ${shape === 'round' ? 'rounded-full' : 'rounded'}`}></div>
            <span className="text-sm">{label}</span>
        </div>
    );

    return (
        <div className="space-y-4">
             <div className="bg-white dark:bg-brand-gray-900 p-4 rounded-xl shadow-md space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h3 className="text-lg font-bold">{t('floor_plan_grid_size')}</h3>
                        <p className="text-sm text-brand-gray-500">{t('floor_plan_editor_desc')}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={handleClearLayout} className="font-semibold text-sm text-red-500 hover:text-red-700">{t('floor_plan_clear_layout')}</button>
                        <button onClick={handlePrintAllQRs} className="font-semibold text-sm text-brand-teal hover:text-brand-teal-dark">{t('floor_plan_print_all_qrs')}</button>
                        <button onClick={handleSaveLayout} disabled={saving} className="bg-brand-teal hover:bg-brand-teal-dark text-white font-bold py-2 px-6 rounded-lg text-sm transition-colors disabled:bg-teal-300">
                             {saving ? t('floor_plan_table_saving') : t('floor_plan_table_save_layout')}
                        </button>
                    </div>
                </div>
                 {message && <p className={`text-sm text-center font-semibold ${message === t('floor_plan_table_saved') ? 'text-green-500' : 'text-red-500'}`}>{message}</p>}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-2">
                    <div className="flex items-center gap-4">
                        <label htmlFor="gridWidth" className="text-sm font-medium whitespace-nowrap">{t('floor_plan_grid_width')}: <span className="font-bold text-brand-teal">{plan.gridWidth}</span></label>
                        <input type="range" id="gridWidth" name="gridWidth" min="5" max="50" value={plan.gridWidth} onChange={handleGridSizeChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
                    </div>
                     <div className="flex items-center gap-4">
                        <label htmlFor="gridHeight" className="text-sm font-medium whitespace-nowrap">{t('floor_plan_grid_height')}: <span className="font-bold text-brand-teal">{plan.gridHeight}</span></label>
                        <input type="range" id="gridHeight" name="gridHeight" min="5" max="50" value={plan.gridHeight} onChange={handleGridSizeChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
                    </div>
                </div>
            </div>

            <div className="flex gap-4 items-start">
                <div className="w-48 flex-shrink-0 bg-white dark:bg-brand-gray-900 p-4 rounded-xl shadow-md">
                    <h4 className="font-bold mb-3">{t('floor_plan_toolbox')}</h4>
                    <div className="space-y-3">
                        <ToolboxButton shape="square" label={t('floor_plan_square_table')} />
                        <ToolboxButton shape="round" label={t('floor_plan_round_table')} />
                    </div>
                </div>
                <div 
                    ref={gridRef}
                    onClick={handleGridClick}
                    className="flex-grow bg-white dark:bg-brand-gray-900 rounded-xl shadow-md p-2 relative min-h-[500px] blueprint-bg touch-none"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${plan.gridWidth}, 1fr)`,
                        gridTemplateRows: `repeat(${plan.gridHeight}, 1fr)`,
                        gap: '2px',
                        cursor: placingMode ? 'copy' : 'default',
                    }}
                >
                    {plan.tables.map(table => (
                        <TableElement 
                            key={table.id}
                            table={{...table, status: 'available'}}
                            isEditable={true}
                            isSelected={selectedTableId === table.id}
                            onPointerDown={(e) => handlePointerDown(e, table)}
                            isPlacingModeActive={!!placingMode}
                            isGhosting={dragState.current.isDragging && dragState.current.draggedTableId === table.id}
                        />
                    ))}
                    {dragState.current.isDragging && ghostTable && (
                        <TableElement
                           table={{...ghostTable, status: 'available'}}
                           isEditable={true}
                           isGhostPreview={true}
                           hasCollision={ghostTable.hasCollision}
                        />
                    )}
                </div>

                 {selectedTable && (
                    <EditorPropertiesPanel
                        table={selectedTable}
                        onUpdate={updateTable}
                        onDelete={deleteTable}
                        restaurantId={plan.userId}
                        profile={profile}
                    />
                )}
            </div>
        </div>
    );
};

export default FloorPlanEditor;