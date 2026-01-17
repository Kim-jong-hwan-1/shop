import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Upload, X, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '@/utils/api';
import Loading from '@/components/common/Loading';

export default function AdminProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    description: '',
    shortDescription: '',
    price: '',
    salePrice: '',
    stock: '',
    sku: '',
    weight: '',
    isFeatured: false,
    isActive: true,
  });

  useEffect(() => {
    fetchCategories();
    if (isEdit) {
      fetchProduct();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const res = await adminAPI.getCategories();
      setCategories(res.data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchProduct = async () => {
    try {
      const res = await adminAPI.getProduct(id);
      const product = res.data.product;
      setFormData({
        name: product.name || '',
        categoryId: product.category_id || '',
        description: product.description || '',
        shortDescription: product.short_description || '',
        price: product.price || '',
        salePrice: product.sale_price || '',
        stock: product.stock || '',
        sku: product.sku || '',
        weight: product.weight || '',
        isFeatured: product.is_featured === 1,
        isActive: product.is_active === 1,
      });
      setExistingImages(product.images || []);
    } catch (error) {
      toast.error('상품 정보를 불러오는데 실패했습니다.');
      navigate('/admin/products');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const maxFiles = 10 - existingImages.length - images.length;

    if (files.length > maxFiles) {
      toast.error(`최대 10개의 이미지만 업로드할 수 있습니다.`);
      return;
    }

    setImages((prev) => [...prev, ...files]);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = async (imageId) => {
    if (!confirm('이 이미지를 삭제하시겠습니까?')) return;

    try {
      await adminAPI.deleteProductImage(id, imageId);
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success('이미지가 삭제되었습니다.');
    } catch (error) {
      toast.error('이미지 삭제에 실패했습니다.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.categoryId) {
      toast.error('상품명, 가격, 카테고리는 필수입니다.');
      return;
    }

    setSaving(true);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('categoryId', formData.categoryId);
      data.append('description', formData.description);
      data.append('shortDescription', formData.shortDescription);
      data.append('price', formData.price);
      if (formData.salePrice) data.append('salePrice', formData.salePrice);
      data.append('stock', formData.stock || 0);
      if (formData.sku) data.append('sku', formData.sku);
      if (formData.weight) data.append('weight', formData.weight);
      data.append('isFeatured', formData.isFeatured);
      data.append('isActive', formData.isActive);

      images.forEach((image) => {
        data.append('images', image);
      });

      if (isEdit) {
        await adminAPI.updateProduct(id, data);
        toast.success('상품이 수정되었습니다.');
      } else {
        await adminAPI.createProduct(data);
        toast.success('상품이 등록되었습니다.');
      }

      navigate('/admin/products');
    } catch (error) {
      toast.error(error.response?.data?.error || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/admin/products')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? '상품 수정' : '상품 등록'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">기본 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상품명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input w-full"
                placeholder="상품명을 입력하세요"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                카테고리 <span className="text-red-500">*</span>
              </label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                className="input w-full"
                required
              >
                <option value="">카테고리 선택</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                className="input w-full"
                placeholder="SKU (선택)"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">짧은 설명</label>
              <input
                type="text"
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                className="input w-full"
                placeholder="짧은 설명 (목록에 표시)"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">상세 설명</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="input w-full"
                rows={5}
                placeholder="상세 설명"
              />
            </div>
          </div>
        </div>

        {/* 가격/재고 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">가격 및 재고</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                정가 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="input w-full"
                placeholder="0"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">할인가</label>
              <input
                type="number"
                name="salePrice"
                value={formData.salePrice}
                onChange={handleChange}
                className="input w-full"
                placeholder="할인가 (선택)"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">재고</label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                className="input w-full"
                placeholder="0"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* 이미지 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">상품 이미지</h2>

          {/* 기존 이미지 */}
          {existingImages.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">등록된 이미지</p>
              <div className="flex flex-wrap gap-3">
                {existingImages.map((img) => (
                  <div key={img.id} className="relative">
                    <img
                      src={img.image_url}
                      alt="상품 이미지"
                      className="w-24 h-24 object-cover rounded-lg border"
                    />
                    {img.is_primary === 1 && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-red-600 text-white text-xs rounded">
                        대표
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeExistingImage(img.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 새 이미지 업로드 */}
          <div className="flex flex-wrap gap-3">
            {images.map((image, index) => (
              <div key={index} className="relative">
                <img
                  src={URL.createObjectURL(image)}
                  alt="미리보기"
                  className="w-24 h-24 object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {existingImages.length + images.length < 10 && (
              <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-red-500 transition-colors">
                <Upload size={24} className="text-gray-400" />
                <span className="text-xs text-gray-500 mt-1">추가</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">최대 10개, 첫 번째 이미지가 대표 이미지로 설정됩니다.</p>
        </div>

        {/* 옵션 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">추가 옵션</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="isFeatured"
                checked={formData.isFeatured}
                onChange={handleChange}
                className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-gray-700">추천 상품으로 표시</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-gray-700">판매 활성화</span>
            </label>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="btn btn-secondary flex-1"
          >
            취소
          </button>
          <button type="submit" disabled={saving} className="btn btn-primary flex-1">
            {saving ? '저장 중...' : isEdit ? '수정' : '등록'}
          </button>
        </div>
      </form>
    </div>
  );
}
