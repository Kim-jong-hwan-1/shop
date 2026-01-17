import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, Eye, EyeOff, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '@/utils/api';
import Loading from '@/components/common/Loading';
import Pagination from '@/components/common/Pagination';

export default function AdminProductList() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [pagination.page, category]);

  const fetchCategories = async () => {
    try {
      const res = await adminAPI.getCategories();
      setCategories(res.data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getProducts({
        page: pagination.page,
        limit: 20,
        category: category || undefined,
        search: search || undefined,
      });
      setProducts(response.data.products || []);
      setPagination(response.data.pagination || { page: 1, total: 0, pages: 1 });
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('상품 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
    fetchProducts();
  };

  const handleToggleActive = async (productId, isActive) => {
    try {
      await adminAPI.updateProduct(productId, { is_active: !isActive });
      toast.success(isActive ? '상품이 비활성화되었습니다.' : '상품이 활성화되었습니다.');
      fetchProducts();
    } catch (error) {
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  const handleDelete = async (productId) => {
    if (!confirm('이 상품을 삭제하시겠습니까?')) return;

    try {
      await adminAPI.deleteProduct(productId);
      toast.success('상품이 삭제되었습니다.');
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.error || '삭제에 실패했습니다.');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ko-KR').format(price || 0);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">상품 관리</h1>
        <Link to="/admin/products/new" className="btn btn-primary flex items-center gap-2">
          <Plus size={20} />
          상품 등록
        </Link>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input w-40"
          >
            <option value="">전체 카테고리</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="상품명 검색"
                className="input pl-10 w-full"
              />
            </div>
            <button type="submit" className="btn btn-primary">검색</button>
          </div>
        </form>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">이미지</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">상품명</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">카테고리</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">가격</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">재고</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">판매량</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">상태</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">관리</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Package size={20} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium">{product.name}</p>
                      {product.sku && (
                        <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{product.category_name || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      {product.sale_price ? (
                        <div>
                          <p className="text-red-600 font-medium">{formatPrice(product.sale_price)}원</p>
                          <p className="text-xs text-gray-400 line-through">{formatPrice(product.price)}원</p>
                        </div>
                      ) : (
                        <p className="font-medium">{formatPrice(product.price)}원</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={product.stock <= 10 ? 'text-red-600 font-medium' : ''}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-gray-600">{product.sale_count || 0}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {product.is_active ? '판매중' : '숨김'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          to={`/admin/products/${product.id}/edit`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="수정"
                        >
                          <Edit2 size={18} />
                        </Link>
                        <button
                          onClick={() => handleToggleActive(product.id, product.is_active)}
                          className={`p-2 rounded-lg ${
                            product.is_active
                              ? 'text-gray-600 hover:bg-gray-100'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={product.is_active ? '숨기기' : '표시'}
                        >
                          {product.is_active ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
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

          {products.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              등록된 상품이 없습니다.
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="p-4 border-t border-gray-200">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.pages}
                onPageChange={(page) => setPagination({ ...pagination, page })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
