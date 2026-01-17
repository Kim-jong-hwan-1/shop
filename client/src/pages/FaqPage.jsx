import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { faqAPI } from '@/utils/api';
import { PageLoading } from '@/components/common/Loading';

export default function FaqPage() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [openItems, setOpenItems] = useState([]);

  const { data, isLoading } = useQuery({
    queryKey: ['faqs'],
    queryFn: faqAPI.getList,
  });

  if (isLoading) return <PageLoading />;

  const { categories, groupedFaqs } = data?.data || { categories: [], groupedFaqs: {} };

  const toggleItem = (id) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const displayFaqs = selectedCategory
    ? { [selectedCategory]: groupedFaqs[selectedCategory] || [] }
    : groupedFaqs;

  return (
    <div className="py-8">
      <div className="container-custom max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">자주 묻는 질문</h1>

        {/* 카테고리 필터 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={`btn btn-sm whitespace-nowrap ${
              !selectedCategory ? 'btn-primary' : 'btn-secondary'
            }`}
          >
            전체
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`btn btn-sm whitespace-nowrap ${
                selectedCategory === cat ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ 목록 */}
        {Object.keys(displayFaqs).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(displayFaqs).map(([category, faqs]) => (
              <div key={category}>
                <h2 className="font-bold text-lg mb-3">{category}</h2>
                <div className="card divide-y">
                  {faqs.map((faq) => (
                    <div key={faq.id}>
                      <button
                        onClick={() => toggleItem(faq.id)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50"
                      >
                        <span className="font-medium pr-4">{faq.question}</span>
                        <ChevronDown
                          size={20}
                          className={`flex-shrink-0 transition-transform ${
                            openItems.includes(faq.id) ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {openItems.includes(faq.id) && (
                        <div className="px-4 pb-4 text-gray-600 whitespace-pre-wrap">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <HelpCircle size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">FAQ가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
