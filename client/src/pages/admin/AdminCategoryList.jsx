import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '@/utils/api';
import Loading from '@/components/common/Loading';

export default function AdminCategoryList() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [editModal, setEditModal] = useState({ open: false, category: null });
  const [formData, setFormData] = useState({ name: '', description: '', sort_order: 0 });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getCategories();
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast.error('카테고리 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (category = null) => {
    if (category) {
      setFormData({
        name: category.name,
        description: category.description || '',
        sort_order: category.sort_order || 0,
      });
    } else {
      setFormData({ name: '', description: '', sort_order: categories.length });
    }
    setEditModal({ open: true, category });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('카테고리명을 입력해주세요.');
      return;
    }

    try {
      if (editModal.category) {
        await adminAPI.updateCategory(editModal.category.id, formData);
        toast.success('카테고리가 수정되었습니다.');
      } else {
        await adminAPI.createCategory(formData);
        toast.success('카테고리가 생성되었습니다.');
      }
      setEditModal({ open: false, category: null });
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.error || '저장에 실패했습니다.');
    }
  };

  const handleDelete = async (categoryId) => {
    if (!confirm('이 카테고리를 삭제하시겠습니까?\n해당 카테고리의 상품들은 미분류로 변경됩니다.')) return;

    try {
      await adminAPI.deleteCategory(categoryId);
      toast.success('카테고리가 삭제되었습니다.');
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.error || '삭제에 실패했습니다.');
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">카테고리 관리</h1>
        <button
          onClick={() => handleOpenModal()}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          카테고리 추가
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 w-12">#</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">카테고리명</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">설명</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">상품 수</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">정렬</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">관리</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category, index) => (
                <tr key={category.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-400">
                    <GripVertical size={16} className="cursor-move" />
                  </td>
                  <td className="py-3 px-4 font-medium">{category.name}</td>
                  <td className="py-3 px-4 text-gray-600">{category.description || '-'}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {category.product_count || 0}개
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-gray-600">{category.sort_order}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenModal(category)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="수정"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="삭제"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {categories.length === 0 && (
          <div className="text-center py-12 text-gray-500">카테고리가 없습니다.</div>
        )}
      </div>

      {/* 카테고리 편집 모달 */}
      {editModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              {editModal.category ? '카테고리 수정' : '새 카테고리'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  카테고리명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                  placeholder="예: 칫솔"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full"
                  rows={3}
                  placeholder="카테고리 설명 (선택)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">정렬순서</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  className="input w-24"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">숫자가 작을수록 먼저 표시됩니다.</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditModal({ open: false, category: null })}
                className="btn btn-secondary flex-1"
              >
                취소
              </button>
              <button onClick={handleSave} className="btn btn-primary flex-1">
                {editModal.category ? '수정' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
