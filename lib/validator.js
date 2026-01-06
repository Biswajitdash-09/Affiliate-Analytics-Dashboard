/**
 * Input Validation and Sanitization Library
 * Protects against XSS, injection attacks, and validates user input
 */

import { ValidationError } from '@/lib/error-handler';

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeString(input, options = {}) {
  if (input === null || input === undefined) {
    return '';
  }

  const str = String(input);

  let sanitized = str;

  // Remove HTML tags
  if (options.stripHtml !== false) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  // Remove JavaScript event handlers (on*, javascript:)
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');
  sanitized = sanitized.replace(/on\w+='[^']*'/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:/gi, '');

  // Remove potentially harmful characters if specified
  if (options.strictMode) {
    sanitized = sanitized.replace(/[<>{}]/g, '');
  }

  // Decode HTML entities to prevent double encoding attacks
  if (decodeEntities && options.decodeHtml !== false) {
    sanitized = sanitized.replace(/</g, '<')
                        .replace(/>/g, '>')
                        .replace(/&/g, '&')
                        .replace(/"/g, '"')
                        .replace(/'/g, "'")
                        .replace(/&#x3C;/g, '<')
                        .replace(/&#x3E;/g, '>');
  }

  // Trim whitespace
  if (options.trim !== false) {
    sanitized = sanitized.trim();
  }

  return sanitized;
}

/**
 * Decode HTML entities
 */
function decodeEntities(text) {
  // This is a simple implementation
  // For production, use a library like 'he'
  return text;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email) {
  if (!email) return '';
  
  // Lowercase email
  const sanitized = String(email).toLowerCase().trim();
  
  // Remove any potentially dangerous characters
  return sanitized.replace(/[^\w@.-]/g, '');
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url, options = {}) {
  if (!url) return '';
  
  let sanitized = String(url).trim();
  
  // Basic URL validation
  try {
    if (!sanitized.startsWith('http://') && !sanitized.startsWith('https://')) {
      if (options.addProtocol) {
        sanitized = 'https://' + sanitized;
      } else {
        throw new Error('Invalid URL');
      }
    }
    
    new URL(sanitized); // This will throw if invalid
  } catch (error) {
    if (options.throwOnError) {
      throw error;
    }
    return '';
  }
  
  // Prevent javascript: protocol
  sanitized = sanitized.replace(/^javascript:/i, '');
  
  return sanitized;
}

/**
 * Sanitize MongoDB ObjectId
 */
export function sanitizeObjectId(id) {
  if (!id) return null;
  
  // Remove any non-hex characters
  const sanitized = String(id).replace(/[^a-fA-F0-9]/g, '');
  
  // Check if it's a valid 24-character hex string
  if (sanitized.length === 24) {
    return sanitized;
  }
  
  return null;
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input, options = {}) {
  if (input === null || input === undefined) {
    return options.defaultValue || 0;
  }
  
  const num = Number(input);
  
  if (isNaN(num)) {
    if (options.throwOnError) {
      throw new Error('Invalid number');
    }
    return options.defaultValue || 0;
  }
  
  // Apply min/max constraints
  const min = options.min ?? Number.MIN_SAFE_INTEGER;
  const max = options.max ?? Number.MAX_SAFE_INTEGER;
  
  if (num < min || num > max) {
    if (options.throwOnError) {
      throw new Error(`Number must be between ${min} and ${max}`);
    }
    return options.defaultValue || 0;
  }
  
  return num;
}

/**
 * Sanitize boolean input
 */
export function sanitizeBoolean(input, defaultValue = false) {
  if (input === null || input === undefined) {
    return defaultValue;
  }
  
  // Handle various boolean representations
  if (typeof input === 'boolean') {
    return input;
  }
  
  const str = String(input).toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(str);
}

/**
 * Sanitize array input
 */
export function sanitizeArray(input, validator) {
  if (!input) return [];
  
  const arr = Array.isArray(input) ? input : [input];
  
  return arr.map(item => {
    if (validator) {
      return validator(item);
    }
    return sanitizeString(item);
  }).filter(item => item !== null && item !== undefined && item !== '');
}

/**
 * Sanitize object input
 */
export function sanitizeObject(input, schema = {}) {
  if (!input || typeof input !== 'object') {
    return {};
  }
  
  const sanitized = {};
  
  for (const key in input) {
    if (input.hasOwnProperty(key)) {
      const value = input[key];
      
      // Skip if key is not in schema and schema is strict
      if (schema.strict && !schema[key]) {
        continue;
      }
      
      const config = schema[key] || {};
      
      if (config.type === 'string') {
        sanitized[key] = sanitizeString(value, config.options);
      } else if (config.type === 'number') {
        sanitized[key] = sanitizeNumber(value, config.options);
      } else if (config.type === 'boolean') {
        sanitized[key] = sanitizeBoolean(value, config.options?.defaultValue);
      } else if (config.type === 'email') {
        sanitized[key] = sanitizeEmail(value);
      } else if (config.type === 'url') {
        sanitized[key] = sanitizeUrl(value, config.options);
      } else if (config.type === 'array') {
        sanitized[key] = sanitizeArray(value, config.validator);
      } else if (config.type === 'object') {
        sanitized[key] = sanitizeObject(value, config.schema);
      } else if (config.validator) {
        sanitized[key] = config.validator(value);
      } else {
        // Default to string sanitization
        sanitized[key] = sanitizeString(value);
      }
    }
  }
  
  // Check for required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (sanitized[field] === undefined || sanitized[field] === null || sanitized[field] === '') {
        throw new ValidationError(`Field '${field}' is required`);
      }
    }
  }
  
  return sanitized;
}

/**
 * Validation Rules
 */
export const ValidationRules = {
  /**
   * Email validation rule
   */
  email: (value) => {
    if (!value) return 'Email is required';
    
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(value)) {
      return 'Invalid email address';
    }
    
    return null; // Valid
  },

  /**
   * Password validation rule
   */
  password: (value, options = {}) => {
    if (!value) return 'Password is required';
    
    if (value.length < (options.minLength || 8)) {
      return `Password must be at least ${options.minLength || 8} characters`;
    }
    
    if (options.requireUppercase && !/[A-Z]/.test(value)) {
      return 'Password must contain at least one uppercase letter';
    }
    
    if (options.requireLowercase && !/[a-z]/.test(value)) {
      return 'Password must contain at least one lowercase letter';
    }
    
    if (options.requireNumber && !/\d/.test(value)) {
      return 'Password must contain at least one number';
    }
    
    if (options.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
      return 'Password must contain at least one special character';
    }
    
    return null; // Valid
  },

  /**
   * URL validation rule
   */
  url: (value) => {
    if (!value) return 'URL is required';
    
    try {
      new URL(value);
      return null;
    } catch (error) {
      return 'Invalid URL format';
    }
  },

  /**
   * Phone number validation rule
   */
  phone: (value, options = {}) => {
    if (!value) return 'Phone number is required';
    
    // Simple regex for phone validation
    const regex = options.allowInternational
      ? /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im
      : /^[0-9]{10}$/;
    
    if (!regex.test(value.replace(/\D/g, ''))) {
      return 'Invalid phone number format';
    }
    
    return null;
  },

  /**
   * Length validation rule
   */
  length: (value, options) => {
    if (value === null || value === undefined) {
      return options.required ? 'This field is required' : null;
    }
    
    const len = String(value).length;
    const min = options.min ?? 0;
    const max = options.max ?? Infinity;
    
    if (len < min) {
      return `Must be at least ${min} characters`;
    }
    
    if (len > max) {
      return `Must be no more than ${max} characters`;
    }
    
    return null;
  },

  /**
   * Range validation rule for numbers
   */
  range: (value, options) => {
    const num = Number(value);
    
    if (isNaN(num)) {
      return 'Must be a valid number';
    }
    
    if (options.min !== undefined && num < options.min) {
      return `Must be at least ${options.min}`;
    }
    
    if (options.max !== undefined && num > options.max) {
      return `Must be no more than ${options.max}`;
    }
    
    return null;
  },

  /**
   * Enum validation rule
   */
  enum: (value, options) => {
    if (!options.values) {
      return 'Invalid enum configuration';
    }
    
    if (!options.values.includes(value)) {
      return `Must be one of: ${options.values.join(', ')}`;
    }
    
    return null;
  },

  /**
   * Pattern validation rule
   */
  pattern: (value, options) => {
    if (!options.regex) {
      return 'Invalid pattern configuration';
    }
    
    if (!options.regex.test(value)) {
      return options.message || 'Invalid format';
    }
    
    return null;
  },

  /**
   * ObjectId validation rule
   */
  objectId: (value) => {
    if (!value) return 'ID is required';
    
    // MongoDB ObjectId is a 24-character hex string
    const hexRegex = /^[0-9a-fA-F]{24}$/;
    
    if (!hexRegex.test(value)) {
      return 'Invalid ID format';
    }
    
    return null;
  },

  /**
   * Monetary amount validation rule
   */
  currency: (value, options = {}) => {
    const num = Number(value);
    
    if (isNaN(num)) {
      return 'Must be a valid amount';
    }
    
    if (num < 0) {
      return 'Amount cannot be negative';
    }
    
    // Check decimal places
    if (options.maxDecimals !== undefined) {
      const decimals = (num.toString().split('.')[1] || '').length;
      if (decimals > options.maxDecimals) {
        return `Amount cannot have more than ${options.maxDecimals} decimal places`;
      }
    }
    
    return null;
  },

  /**
   * Date validation rule
   */
  date: (value, options = {}) => {
    if (!value) {
      return options.required ? 'Date is required' : null;
    }
    
    const date = new Date(value);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date format';
    }
    
    if (options.minDate && date < new Date(options.minDate)) {
      return `Date must be after ${options.minDate}`;
    }
    
    if (options.maxDate && date > new Date(options.maxDate)) {
      return `Date must be before ${options.maxDate}`;
    }
    
    return null;
  },
};

/**
 * Validate data against a schema
 */
export function validate(data, schema) {
  const errors = [];
  
  for (const field in schema) {
    const value = data[field];
    const config = schema[field];
    
    // Check required
    if (config.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }
    
    // Skip if not required and value is empty
    if (!config.required && (value === undefined || value === null || value === '')) {
      continue;
    }
    
    // Apply validators
    if (config.validators && Array.isArray(config.validators)) {
      for (const validator of config.validators) {
        const error = validator(value);
        if (error) {
          errors.push(typeof error === 'string' ? error : `${field}: ${error}`);
        }
      }
    }
    
    // Apply type-specific validation
    if (config.type) {
      switch (config.type) {
        case 'email':
          const emailError = ValidationRules.email(value);
          if (emailError) errors.push(emailError);
          break;
        case 'password':
          const passError = ValidationRules.password(value, config.options);
          if (passError) errors.push(passError);
          break;
        case 'url':
          const urlError = ValidationRules.url(value);
          if (urlError) errors.push(urlError);
          break;
        case 'number':
          const numError = ValidationRules.range(value, config.options);
          if (numError) errors.push(numError);
          break;
      }
    }
  }
  
  return errors.length > 0 ? errors : null;
}

export default {
  sanitizeString,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeObjectId,
  sanitizeNumber,
  sanitizeBoolean,
  sanitizeArray,
  sanitizeObject,
  ValidationRules,
  validate,
};