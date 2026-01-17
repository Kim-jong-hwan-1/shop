import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Check, Store, User as UserIcon, AlertCircle } from 'lucide-react';
import { authAPI, termsAPI } from '@/utils/api';
import { useAuthStore } from '@/context/authStore';
import { validators } from '@/utils/helpers';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailChecked, setIsEmailChecked] = useState(false);
  const [isEmailAvailable, setIsEmailAvailable] = useState(false);
  const [userType, setUserType] = useState('buyer');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm({
    defaultValues: {
      agreeTerms: false,
      agreePrivacy: false,
      marketingAgree: false,
    },
  });

  const password = watch('password');
  const email = watch('email');

  // 이메일 중복 확인
  const checkEmail = async () => {
    if (!email || !validators.email(email) === true) {
      const result = validators.email(email);
      if (result !== true) {
        setError('email', { message: result });
        return;
      }
    }

    try {
      const { data } = await authAPI.checkEmail(email);
      if (data.available) {
        setIsEmailChecked(true);
        setIsEmailAvailable(true);
        clearErrors('email');
        toast.success('사용 가능한 이메일입니다.');
      } else {
        setIsEmailChecked(true);
        setIsEmailAvailable(false);
        setError('email', { message: '이미 사용 중인 이메일입니다.' });
      }
    } catch (error) {
      toast.error('이메일 확인에 실패했습니다.');
    }
  };

  // 이메일 변경 시 확인 초기화
  const handleEmailChange = () => {
    setIsEmailChecked(false);
    setIsEmailAvailable(false);
  };

  const onSubmit = async (data) => {
    if (!isEmailChecked || !isEmailAvailable) {
      toast.error('이메일 중복 확인을 해주세요.');
      return;
    }

    // 판매자인 경우 필수 필드 검증
    if (userType === 'seller') {
      if (!data.businessName?.trim()) {
        setError('businessName', { message: '상호명을 입력해주세요.' });
        return;
      }
      if (!data.businessNumber?.trim()) {
        setError('businessNumber', { message: '사업자등록번호를 입력해주세요.' });
        return;
      }
    }

    setIsLoading(true);
    try {
      const response = await authAPI.register({
        ...data,
        userType,
        agreeTerms: String(data.agreeTerms),
        agreePrivacy: String(data.agreePrivacy),
      });
      setAuth(response.data.user, response.data.token);

      if (userType === 'seller') {
        toast.success('회원가입이 완료되었습니다!\n판매자 승인 후 상품 등록이 가능합니다.', {
          duration: 5000
        });
      } else {
        toast.success('회원가입이 완료되었습니다!');
      }
      navigate('/');
    } catch (error) {
      const message = error.response?.data?.error || '회원가입에 실패했습니다.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">회원가입</h1>
          <p className="mt-2 text-gray-600">오랄케어샵 회원이 되어주세요</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* 회원 유형 선택 */}
            <div>
              <label className="label">회원 유형 <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUserType('buyer')}
                  className={`flex items-center justify-center gap-2 p-4 border-2 rounded-lg transition-all ${
                    userType === 'buyer'
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <UserIcon size={20} />
                  <span className="font-medium">구매자</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('seller')}
                  className={`flex items-center justify-center gap-2 p-4 border-2 rounded-lg transition-all ${
                    userType === 'seller'
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Store size={20} />
                  <span className="font-medium">판매자</span>
                </button>
              </div>
              {userType === 'seller' && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex gap-2">
                    <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-700">
                      판매자로 가입 시 관리자 승인 후 상품 등록이 가능합니다.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 이메일 */}
            <div>
              <label htmlFor="email" className="label">
                이메일 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  id="email"
                  className={`input flex-1 ${errors.email ? 'input-error' : ''}`}
                  placeholder="example@email.com"
                  {...register('email', {
                    required: '이메일을 입력해주세요.',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: '올바른 이메일 형식이 아닙니다.',
                    },
                    onChange: handleEmailChange,
                  })}
                />
                <button
                  type="button"
                  onClick={checkEmail}
                  className="btn btn-secondary whitespace-nowrap"
                >
                  중복확인
                </button>
              </div>
              {errors.email && (
                <p className="error-message">{errors.email.message}</p>
              )}
              {isEmailChecked && isEmailAvailable && (
                <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                  <Check size={16} />
                  사용 가능한 이메일입니다
                </p>
              )}
            </div>

            {/* 비밀번호 */}
            <div>
              <label htmlFor="password" className="label">
                비밀번호 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="8자 이상, 영문/숫자/특수문자 포함"
                  {...register('password', {
                    required: '비밀번호를 입력해주세요.',
                    validate: validators.password,
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="error-message">{errors.password.message}</p>
              )}
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label htmlFor="confirmPassword" className="label">
                비밀번호 확인 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  className={`input pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                  placeholder="비밀번호를 다시 입력해주세요"
                  {...register('confirmPassword', {
                    required: '비밀번호 확인을 입력해주세요.',
                    validate: (value) =>
                      value === password || '비밀번호가 일치하지 않습니다.',
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="error-message">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* 이름 */}
            <div>
              <label htmlFor="name" className="label">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                className={`input ${errors.name ? 'input-error' : ''}`}
                placeholder="홍길동"
                {...register('name', {
                  required: '이름을 입력해주세요.',
                })}
              />
              {errors.name && (
                <p className="error-message">{errors.name.message}</p>
              )}
            </div>

            {/* 전화번호 */}
            <div>
              <label htmlFor="phone" className="label">
                휴대폰 번호
              </label>
              <input
                type="tel"
                id="phone"
                className={`input ${errors.phone ? 'input-error' : ''}`}
                placeholder="010-0000-0000"
                {...register('phone', {
                  validate: (value) => {
                    if (!value) return true;
                    return validators.phone(value);
                  },
                })}
              />
              {errors.phone && (
                <p className="error-message">{errors.phone.message}</p>
              )}
            </div>

            {/* 판매자 정보 (판매자 선택 시에만 표시) */}
            {userType === 'seller' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900">판매자 정보</h3>

                {/* 상호명 */}
                <div>
                  <label htmlFor="businessName" className="label">
                    상호명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="businessName"
                    className={`input ${errors.businessName ? 'input-error' : ''}`}
                    placeholder="상호명을 입력해주세요"
                    {...register('businessName')}
                  />
                  {errors.businessName && (
                    <p className="error-message">{errors.businessName.message}</p>
                  )}
                </div>

                {/* 사업자등록번호 */}
                <div>
                  <label htmlFor="businessNumber" className="label">
                    사업자등록번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="businessNumber"
                    className={`input ${errors.businessNumber ? 'input-error' : ''}`}
                    placeholder="123-45-67890"
                    {...register('businessNumber')}
                  />
                  {errors.businessNumber && (
                    <p className="error-message">{errors.businessNumber.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* 약관 동의 */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  {...register('agreeTerms', {
                    required: '이용약관에 동의해주세요.',
                  })}
                />
                <label htmlFor="agreeTerms" className="text-sm flex-1">
                  <span className="text-red-500">[필수]</span>{' '}
                  <Link to="/terms/service" target="_blank" className="text-primary-600 hover:underline">
                    이용약관
                  </Link>
                  에 동의합니다.
                </label>
              </div>
              {errors.agreeTerms && (
                <p className="error-message">{errors.agreeTerms.message}</p>
              )}

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="agreePrivacy"
                  {...register('agreePrivacy', {
                    required: '개인정보 처리방침에 동의해주세요.',
                  })}
                />
                <label htmlFor="agreePrivacy" className="text-sm flex-1">
                  <span className="text-red-500">[필수]</span>{' '}
                  <Link to="/terms/privacy" target="_blank" className="text-primary-600 hover:underline">
                    개인정보 처리방침
                  </Link>
                  에 동의합니다.
                </label>
              </div>
              {errors.agreePrivacy && (
                <p className="error-message">{errors.agreePrivacy.message}</p>
              )}

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="marketingAgree"
                  {...register('marketingAgree')}
                />
                <label htmlFor="marketingAgree" className="text-sm flex-1">
                  <span className="text-gray-500">[선택]</span> 마케팅 정보 수신에 동의합니다.
                </label>
              </div>
            </div>

            {/* 가입 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full py-3"
            >
              {isLoading ? '가입 중...' : '회원가입'}
            </button>
          </form>

          {/* 로그인 링크 */}
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">이미 회원이신가요? </span>
            <Link to="/login" className="text-primary-600 hover:underline font-medium">
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
