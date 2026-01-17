import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { userAPI, authAPI } from '@/utils/api';
import { useAuthStore } from '@/context/authStore';
import { validators } from '@/utils/helpers';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      zipcode: user?.zipcode || '',
      address: user?.address || '',
      addressDetail: user?.address_detail || '',
      marketingAgree: user?.marketing_agree || false,
      emailAgree: user?.email_agree || false,
      smsAgree: user?.sms_agree || false,
    }
  });

  const updateMutation = useMutation({
    mutationFn: userAPI.updateProfile,
    onSuccess: (data) => {
      updateUser(data.data.user);
      toast.success('회원정보가 수정되었습니다.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || '수정에 실패했습니다.');
    },
  });

  const onSubmit = (data) => {
    updateMutation.mutate(data);
  };

  return (
    <div className="py-8">
      <div className="container-custom max-w-lg">
        <h1 className="text-2xl font-bold mb-6">회원 정보 수정</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
          <div>
            <label className="label">이메일</label>
            <input type="email" value={user?.email || ''} disabled className="input bg-gray-100" />
          </div>

          <div>
            <label className="label">이름</label>
            <input
              type="text"
              className={`input ${errors.name ? 'input-error' : ''}`}
              {...register('name', { required: '이름을 입력해주세요.' })}
            />
            {errors.name && <p className="error-message">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">휴대폰 번호</label>
            <input
              type="tel"
              className={`input ${errors.phone ? 'input-error' : ''}`}
              placeholder="010-0000-0000"
              {...register('phone', {
                validate: (value) => !value || validators.phone(value),
              })}
            />
            {errors.phone && <p className="error-message">{errors.phone.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">우편번호</label>
              <input type="text" className="input" {...register('zipcode')} />
            </div>
            <div className="col-span-2">
              <label className="label">주소</label>
              <input type="text" className="input" {...register('address')} />
            </div>
          </div>

          <div>
            <label className="label">상세주소</label>
            <input type="text" className="input" {...register('addressDetail')} />
          </div>

          <div className="pt-4 border-t">
            <p className="font-medium mb-3">마케팅 수신 동의</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register('marketingAgree')} />
                <span className="text-sm">마케팅 정보 수신 동의</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register('emailAgree')} />
                <span className="text-sm">이메일 수신 동의</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register('smsAgree')} />
                <span className="text-sm">SMS 수신 동의</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="btn btn-primary w-full py-3"
          >
            {updateMutation.isPending ? '저장 중...' : '저장'}
          </button>
        </form>
      </div>
    </div>
  );
}
