import React, { useState, useEffect } from 'react';
import { doc, setDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { MenuItem, Category, ModifierGroup, RecipeItem, Ingredient, RestaurantProfile } from '../../types';
import ModifierManager from '../ModifierManager';
import { useTranslation } from '../../contexts/LanguageContext';
import LinkIngredientModal from '../inventory/LinkIngredientModal';
import { XIcon } from '../icons';

interface MenuFormProps {
  item: MenuItem | null;
  onClose: () => void;
  userId: string;
  categories: Category[];
  menuItems: MenuItem[];
  profile: RestaurantProfile | null;
}

const MenuForm: React.FC<MenuFormProps> = ({ item, onClose, userId, categories, menuItems, profile }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Omit<MenuItem, 'id' | 'userId' | 'order'>>({
    name: '',
    category: '',
    price: 0,
    description: '',
    isAvailable: true,
    imageUrl: '',
    modifierGroups: [],
    recipe: [],
    prepTimeMinutes: 0,
    stationName: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(item?.imageUrl || null);
  const [loading, setLoading] = useState(false);
  const [isLinkingIngredient, setIsLinkingIngredient] = useState(false);

  useEffect(() => {
      setFormData({
        name: item?.name || '',
        category: item?.category || categories[0]?.name || '',
        price: item?.price || 0,
        description: item?.description || '',
        isAvailable: item?.isAvailable ?? true,
        imageUrl: item?.imageUrl || '',
        modifierGroups: item?.modifierGroups || [],
        recipe: item?.recipe || [],
        prepTimeMinutes: item?.prepTimeMinutes || 0,
        stationName: item?.stationName || '',
      })
      setImagePreview(item?.imageUrl || null)
  }, [item, categories])

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: (name === 'price' || name === 'prepTimeMinutes') ? parseFloat(value) : value }));
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setImageFile(file);
          const reader = new FileReader();
          reader.onloadend = () => {
              setImagePreview(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };
  
  const handleModifiersChange = (modifierGroups: ModifierGroup[]) => {
      setFormData(prev => ({ ...prev, modifierGroups }));
  }

  const handleRecipeChange = (recipe: RecipeItem[]) => {
      setFormData(prev => ({ ...prev, recipe }));
  }

  const handleAddRecipeItem = (ingredient: Ingredient, quantity: number) => {
    const newRecipeItem: RecipeItem = {
        ingredientId: ingredient.id,
        name: ingredient.name,
        quantity,
        unit: ingredient.unit,
    };
    handleRecipeChange([...(formData.recipe || []), newRecipeItem]);
  }
  
  const handleRemoveRecipeItem = (ingredientId: string) => {
    handleRecipeChange((formData.recipe || []).filter(item => item.ingredientId !== ingredientId));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !formData.category) {
        console.error("No user ID or category provided.");
        alert(t('menu_form_alert_no_category'));
        return;
    }
    
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
        alert(t('menu_form_alert_name_empty'));
        return;
    }

    const isDuplicate = menuItems.some(
        existingItem => 
            existingItem.name.toLowerCase() === trimmedName.toLowerCase() &&
            (!item || existingItem.id !== item.id) // It's a duplicate if the name matches AND (it's a new item OR it's a different item being edited)
    );

    if (isDuplicate) {
        alert(t('menu_form_alert_name_duplicate'));
        return;
    }

    setLoading(true);

    const isNewItem = !item;
    const itemsInCategory = menuItems.filter(i => i.category === formData.category);
    const order = isNewItem ? itemsInCategory.length : item.order;

    const itemData: Omit<MenuItem, 'id'> = { ...formData, name: trimmedName, userId, order };
    
    const docRef = item ? doc(db, "menuItems", item.id) : doc(collection(db, "menuItems"));
    const itemId = docRef.id;

    try {
        if (imageFile) {
            const imageRef = ref(storage, `menuItemImages/${userId}/${itemId}/${imageFile.name}`);
            const uploadResult = await uploadBytes(imageRef, imageFile);
            itemData.imageUrl = await getDownloadURL(uploadResult.ref);
        } else {
            itemData.imageUrl = formData.imageUrl;
        }

        await setDoc(docRef, { ...itemData, id: itemId }, { merge: true });
        
        onClose();
    } catch (error) {
      console.error("Error saving menu item: ", error);
      alert(t('menu_form_alert_save_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="h-full flex flex-col">
      <div className="flex-grow overflow-y-auto p-6 space-y-4">
          <h2 className="text-xl font-bold text-brand-gray-800 dark:text-white">
            {item ? t('menu_form_edit_title') : t('menu_form_add_title')}
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">{t('menu_form_item_image')}</label>
            <div className="mt-1 flex items-center space-x-4">
                <span className="h-24 w-24 rounded-md overflow-hidden bg-brand-gray-100 dark:bg-brand-gray-700 flex items-center justify-center">
                    <img 
                        src={imagePreview || `https://placehold.co/200x200/1f2937/e5e7eb?text=${encodeURIComponent(formData.name || t('menu_form_new_item_placeholder'))}`} 
                        alt={t('menu_form_image_preview_alt')} 
                        className="h-full w-full object-cover" 
                    />
                </span>
                <label htmlFor="file-upload" className="cursor-pointer bg-white dark:bg-brand-gray-700 py-2 px-3 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm text-sm font-medium text-brand-gray-700 dark:text-brand-gray-200 hover:bg-brand-gray-50 dark:hover:bg-brand-gray-600">
                    <span>{t('menu_form_upload_button')}</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg" />
                </label>
            </div>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">{t('menu_form_name_label')}</label>
            <input type="text" name="name" id="name" value={formData.name} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal" />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">{t('menu_form_category_label')}</label>
            <select
                name="category"
                id="category"
                value={formData.category}
                onChange={handleFormChange}
                required
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal"
            >
                <option value="" disabled>{t('menu_form_select_category')}</option>
                {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
            </select>
          </div>
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">{t('menu_form_price_label')}</label>
            <input type="number" name="price" id="price" value={formData.price} onChange={handleFormChange} required min="0" step="0.001" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal" />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">{t('menu_form_description_label')}</label>
            <textarea name="description" id="description" value={formData.description} onChange={handleFormChange} rows={3} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal"></textarea>
          </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="stationName" className="block text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">{t('menu_form_station_label')}</label>
                    <select name="stationName" id="stationName" value={formData.stationName} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal">
                        <option value="">{t('menu_form_station_placeholder')}</option>
                        {profile?.kitchenStations?.map(station => (
                            <option key={station.id} value={station.name}>{station.name}</option>
                        ))}
                    </select>
                </div>
                 <div>
                    <label htmlFor="prepTimeMinutes" className="block text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">{t('menu_form_prep_time_label')}</label>
                    <input type="number" name="prepTimeMinutes" id="prepTimeMinutes" value={formData.prepTimeMinutes || ''} onChange={handleFormChange} min="0" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal" />
                </div>
           </div>
           <div>
            <label htmlFor="isAvailable" className="flex items-center text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">
                <input type="checkbox" name="isAvailable" id="isAvailable" checked={formData.isAvailable} onChange={handleFormChange} className="h-4 w-4 rounded border-gray-300 text-brand-teal focus:ring-brand-teal" />
                <span className="ml-2">{t('menu_form_is_available_label')}</span>
            </label>
          </div>

          <div className="border-t border-brand-gray-200 dark:border-brand-gray-700 pt-4">
            <h3 className="text-lg font-bold text-brand-gray-700 dark:text-brand-gray-200">{t('menu_form_ingredients_title')}</h3>
            <p className="text-sm text-brand-gray-500 mb-3">{t('menu_form_ingredients_desc')}</p>
            <div className="space-y-2">
                {(formData.recipe || []).map(recipeItem => (
                    <div key={recipeItem.ingredientId} className="flex justify-between items-center p-2 bg-brand-gray-50 dark:bg-brand-gray-700/50 rounded-md">
                        <p className="text-sm font-medium">{recipeItem.name}</p>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-mono">{recipeItem.quantity} {recipeItem.unit}</p>
                            <button type="button" onClick={() => handleRemoveRecipeItem(recipeItem.ingredientId)} className="text-red-500 hover:text-red-700">
                                <XIcon className="w-4 h-4"/>
                            </button>
                        </div>
                    </div>
                ))}
                 <button type="button" onClick={() => setIsLinkingIngredient(true)} className="w-full text-sm font-semibold py-2 px-4 rounded-lg border-2 border-dashed border-brand-gray-300 dark:border-brand-gray-600 text-brand-gray-500 hover:border-brand-teal hover:text-brand-teal">
                    {t('menu_form_link_ingredient_button')}
                </button>
            </div>
          </div>

          <div className="border-t border-brand-gray-200 dark:border-brand-gray-700 pt-4">
            <ModifierManager 
                initialGroups={formData.modifierGroups || []}
                onChange={handleModifiersChange}
            />
          </div>
      </div>
      <div className="flex-shrink-0 flex justify-end space-x-3 p-4 bg-white dark:bg-brand-gray-900 border-t border-brand-gray-200 dark:border-brand-gray-700">
        <button type="button" onClick={onClose} className="bg-brand-gray-200 dark:bg-brand-gray-600 text-brand-gray-800 dark:text-brand-gray-100 font-bold py-2 px-4 rounded-lg text-sm hover:bg-brand-gray-300 dark:hover:bg-brand-gray-500">
            {t('common_cancel')}
        </button>
        <button type="submit" disabled={loading} className="bg-brand-teal text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-brand-teal-dark disabled:bg-teal-300">
            {loading ? t('common_saving') : t('common_save')}
        </button>
      </div>
    </form>
    {isLinkingIngredient && (
        <LinkIngredientModal
            userId={userId}
            onClose={() => setIsLinkingIngredient(false)}
            onLinkIngredient={handleAddRecipeItem}
            existingRecipeItems={formData.recipe || []}
        />
    )}
    </>
  );
};

export default MenuForm;