import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { ApiError, errorMessage } from '../api/client';
import { Field } from '../components/form';
import { Alert, Button, Card } from '../components/ui';
import { useAuth } from '../context/useAuth';

// Backend kuralıyla aynı: 8-72 karakter, en az bir harf ve bir rakam
const schema = z
  .object({
    email: z.email('Geçerli bir e-posta girin'),
    password: z
      .string()
      .min(8, 'Parola en az 8 karakter olmalı')
      .max(72, 'Parola en fazla 72 karakter olabilir')
      .regex(/[A-Za-zÇĞİÖŞÜçğıöşü]/, 'Parola en az bir harf içermeli')
      .regex(/\d/, 'Parola en az bir rakam içermeli'),
    passwordConfirm: z.string(),
    consent: z.literal(true, 'Devam etmek için onay vermelisiniz'),
  })
  .refine((v) => v.password === v.passwordConfirm, { path: ['passwordConfirm'], message: 'Parolalar eşleşmiyor' });
type FormValues = z.input<typeof schema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError(null);
    try {
      await registerUser(email, password);
      navigate('/anket', { replace: true }); // yeni kullanıcı önce anketi doldurur
    } catch (err) {
      const fields = err instanceof ApiError ? err.fieldErrors() : {};
      if (fields.email) setError('email', { message: fields.email });
      if (fields.password) setError('password', { message: fields.password });
      if (!fields.email && !fields.password) setServerError(errorMessage(err));
    }
  });

  return (
    <div className="auth-page stack">
      <div className="center">
        <h1>Kayıt ol</h1>
        <p className="muted">Size özel, güvenli egzersiz planı için hesap oluşturun. (18 yaş ve üzeri)</p>
      </div>
      <Card>
        <form className="stack" onSubmit={onSubmit} noValidate>
          {serverError && <Alert tone="danger">{serverError}</Alert>}
          <Field label="E-posta" error={errors.email?.message}>
            <input className="input" type="email" autoComplete="email" {...register('email')} />
          </Field>
          <Field label="Parola" hint="En az 8 karakter, bir harf ve bir rakam" error={errors.password?.message}>
            <input className="input" type="password" autoComplete="new-password" {...register('password')} />
          </Field>
          <Field label="Parola (tekrar)" error={errors.passwordConfirm?.message}>
            <input className="input" type="password" autoComplete="new-password" {...register('passwordConfirm')} />
          </Field>
          <label className="check">
            <input type="checkbox" {...register('consent')} />
            <span>
              Sağlık bilgilerimin yalnızca egzersiz planı oluşturmak amacıyla işlenmesine onay veriyorum. Uygulamanın tanı
              koymadığını ve muayenenin yerini almadığını biliyorum.
            </span>
          </label>
          {errors.consent && (
            <span className="error small" role="alert" style={{ color: 'var(--danger)' }}>
              {errors.consent.message}
            </span>
          )}
          <Button type="submit" block loading={isSubmitting}>
            Hesap oluştur
          </Button>
        </form>
      </Card>
      <p className="center">
        Zaten hesabınız var mı? <Link to="/giris">Giriş yapın</Link>
      </p>
    </div>
  );
}
