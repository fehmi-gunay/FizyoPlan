import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { errorMessage } from '../api/client';
import { Field } from '../components/form';
import { Alert, Button, Card } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const schema = z.object({
  email: z.email('Geçerli bir e-posta girin'),
  password: z.string().min(1, 'Parola gerekli'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(errorMessage(err));
    }
  });

  return (
    <div className="auth-page stack">
      <div className="center">
        <h1>Giriş yap</h1>
        <p className="muted">Kişisel egzersiz planınıza devam edin.</p>
      </div>
      <Card>
        <form className="stack" onSubmit={onSubmit} noValidate>
          {serverError && <Alert tone="danger">{serverError}</Alert>}
          <Field label="E-posta" error={errors.email?.message}>
            <input className="input" type="email" autoComplete="email" {...register('email')} />
          </Field>
          <Field label="Parola" error={errors.password?.message}>
            <input className="input" type="password" autoComplete="current-password" {...register('password')} />
          </Field>
          <Button type="submit" block loading={isSubmitting}>
            Giriş yap
          </Button>
        </form>
      </Card>
      <p className="center">
        Hesabınız yok mu? <Link to="/kayit">Kayıt olun</Link>
      </p>
    </div>
  );
}
