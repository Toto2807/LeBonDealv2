import * as userService from '../services/userService.js';

export async function getMe(req, res) {
    res.status(200).json(await userService.getProfile(req.userId));
}
