// W1 – Register (farmers only).
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthCard from '../components/AuthCard';
import { api } from '../services/api';

const empty = { full_name: '', phone: '', email: '', password: '', confirm: '' };

// Returns a translation key per field, or an empty object if everything is valid.
function validate(f) {
  const errors = {};
  if (f.full_name.trim().length < 3) errors.full_name = 'register.errFullName';
  if (!/^0[17]\d{8}$/.test(f.phone.replace(/\s/g, ''))) errors.phone = 'register.errPhone';
  if (!/^\S+@\S+\.\S+$/.test(f.email)) errors.email = 'register.errEmail';
  if (f.password.length < 8) errors.password = 'register.errPassword';
  if (f.confirm !== f.password) errors.confirm = 'register.errConfirm';
  return errors;
}

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    setServerError('');
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await api.register({
        full_name: form.full_name.trim(),
        phone: form.phone.replace(/\s/g, ''),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // One labelled input with its error message underneath.
  const field = (name, label, type = 'text', placeholder = '') => (
    <div className="mb-3">
      <label htmlFor={name} className="form-label">{label}</label>
      <input id={name} name={name} type={type} placeholder={placeholder}
        className={`form-control ${errors[name] ? 'is-invalid' : ''}`}
        value={form[name]} onChange={update} />
      {errors[name] && <div className="invalid-feedback">{t(errors[name])}</div>}
    </div>
  );

  return (
    <AuthCard title={t('register.title')}>
      <form onSubmit={handleSubmit} noValidate>
        {field('full_name', t('register.fullName'), 'text', 'Wanjiku Mwangi')}
        {field('phone', t('register.phone'), 'tel', '0712 345 678')}
        {field('email', t('register.email'), 'email', 'wanjiku@example.com')}
        {field('password', t('register.password'), 'password')}
        {field('confirm', t('register.confirm'), 'password')}

        {serverError && <div className="alert alert-danger py-2">{serverError}</div>}

        <button type="submit" className="btn btn-primary w-100" disabled={busy}>
          {busy ? t('register.submitting') : t('register.submit')}
        </button>
      </form>

      <p className="small text-body-secondary mt-3 mb-1">
        {t('register.staffNote')}
      </p>
      <div className="small">{t('register.already')} <Link to="/login">{t('register.logIn')}</Link></div>
    </AuthCard>
  );
}
