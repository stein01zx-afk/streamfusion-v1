import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST || '';
const port = Number(process.env.SMTP_PORT || 587);
const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
const user = process.env.SMTP_USER || '';
const pass = process.env.SMTP_PASS || '';
const from = process.env.SMTP_FROM || user;

export function emailConfigured() { return Boolean(host && user && pass && from); }

function transporter() {
  if (!emailConfigured()) throw new Error('El servidor de correo no está configurado.');
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 });
}

export async function sendVerificationEmail({ to, displayName, verificationUrl }) {
  const subject = 'Verifica tu correo electrónico — StreamFusion';
  const safeName = String(displayName || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#0b0b12;color:#fff;padding:32px"><div style="max-width:560px;margin:auto;background:#171722;border-radius:18px;padding:28px"><h1 style="margin-top:0">Bienvenido a StreamFusion 👋</h1><p>Hola ${safeName || 'creador'},</p><p>Bienvenido a StreamFusion, te saluda <strong>Alen 👋</strong>, creador de este sistema.</p><p>Por favor verifica tu correo para terminar con el registro y activar tu cuenta.</p><p><a href="${verificationUrl}" style="display:inline-block;background:#7c5cff;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px">Verificar mi correo</a></p><p style="opacity:.7">Este enlace caduca en 24 horas.</p><p style="opacity:.5;font-size:12px">Si no creaste esta cuenta, puedes ignorar este mensaje.</p></div></body></html>`;
  const text = `Bienvenido a StreamFusion, te saluda Alen 👋, creador de este sistema. Por favor verifica tu correo para terminar con el registro.

Hola ${displayName||'creador'}, verifica tu correo aquí: ${verificationUrl}

Este enlace caduca en 24 horas.`;
  const sendPromise = transporter().sendMail({ from, to, subject, text, html });
  await Promise.race([sendPromise, new Promise((_, reject) => setTimeout(() => reject(new Error('El servidor de correo tardó demasiado en responder. Revisa SMTP en Railway.')), 20000))]);
}


export async function sendPasswordResetEmail({ to, displayName, resetUrl }) {
  const subject = 'Recupera tu contraseña — StreamFusion';
  const safeName = String(displayName || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#0b0b12;color:#fff;padding:32px"><div style="max-width:560px;margin:auto;background:#171722;border-radius:18px;padding:28px"><h1 style="margin-top:0">Bienvenido a StreamFusion 👋</h1><p>Hola ${safeName || 'creador'},</p><p>Bienvenido a StreamFusion, te saluda <strong>Alen 👋</strong>, creador de este sistema.</p><p>Por favor usa el siguiente enlace para <strong>recuperar tu contraseña</strong> y volver a entrar a tu cuenta.</p><p><a href="${resetUrl}" style="display:inline-block;background:#7c5cff;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px">Recuperar mi contraseña</a></p><p style="opacity:.7">Este enlace caduca en 30 minutos.</p><p style="opacity:.5;font-size:12px">Si no solicitaste recuperar tu contraseña, puedes ignorar este mensaje.</p></div></body></html>`;
  const text = `Bienvenido a StreamFusion, te saluda Alen 👋, creador de este sistema. Para recuperar tu contraseña entra aquí: ${resetUrl}\n\nEste enlace caduca en 30 minutos.`;
  const sendPromise = transporter().sendMail({ from, to, subject, text, html });
  await Promise.race([sendPromise, new Promise((_, reject) => setTimeout(() => reject(new Error('El servidor de correo tardó demasiado en responder. Revisa SMTP en Railway.')), 20000))]);
}
