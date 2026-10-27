import * as authService from '../services/authService.js';
import { validateRegister, validateLogin } from '../validators/authValidator.js';

export async function register(req, res) {
    const result = await authService.register(validateRegister(req.body));
    res.status(201).json(result);
}

export async function login(req, res) {
    const result = await authService.login(validateLogin(req.body));
    res.status(200).json(result);
}
