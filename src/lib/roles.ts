// Roles operativos que SÍ pueden entrar por PIN (rotan en un aparato compartido).
// Dueño, Gerente/Administrador y súper-admin NUNCA entran por PIN — solo con
// contraseña completa. Este candado se valida en el servidor.
export const ROLES_PIN = ['cajero', 'tecnico', 'asesor', 'almacenista'] as const

export type RolPin = (typeof ROLES_PIN)[number]
