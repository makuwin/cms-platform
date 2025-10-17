export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

type Validator<T> = (value: unknown) => T;

function assertString(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${label} is required`);
  }
  return value.trim();
}

function assertEmail(value: unknown) {
  const email = assertString(value, 'Email');
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!pattern.test(email)) {
    throw new ValidationError('Email is invalid');
  }
  return email.toLowerCase();
}

function assertOptionalString(value: unknown, label: string) {
  if (value == null) return undefined;
  if (typeof value !== 'string') {
    throw new ValidationError(`${label} must be a string`);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function assertJson(value: unknown, label: string) {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

export type LoginInput = {
  email: string;
  password: string;
};

export const validateLogin: Validator<LoginInput> = (body) => {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid payload');
  }

  return {
    email: assertEmail((body as Record<string, unknown>).email),
    password: assertString((body as Record<string, unknown>).password, 'Password'),
  };
};

export type RegisterInput = {
  email: string;
  password: string;
  role?: string;
  name?: string;
};

export const validateRegister: Validator<RegisterInput> = (body) => {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid payload');
  }
  const data = body as Record<string, unknown>;
  return {
    email: assertEmail(data.email),
    password: assertString(data.password, 'Password'),
    role: assertOptionalString(data.role, 'Role'),
    name: assertOptionalString(data.name, 'Name'),
  };
};

export type ContentInput = {
  title: string;
  slug: string;
  type: string;
  data: Record<string, unknown>;
};

export const validateContent: Validator<ContentInput> = (body) => {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid payload');
  }
  const data = body as Record<string, unknown>;
  return {
    title: assertString(data.title, 'Title'),
    slug: assertString(data.slug, 'Slug'),
    type: assertString(data.type, 'Type'),
    data: assertJson(data.data, 'Data'),
  };
};

export const validateSearchQuery = (params: URLSearchParams) => {
  const query = params.get('q')?.trim() ?? '';
  if (!query) {
    throw new ValidationError('Search term "q" is required');
  }
  return {
    query,
    type: params.get('type')?.trim() ?? undefined,
    author: params.get('author')?.trim() ?? undefined,
    date: params.get('date')?.trim() ?? undefined,
  };
};
