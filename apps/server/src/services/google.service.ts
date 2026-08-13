import axios from 'axios';
import { envConfig } from '../config';
import { GOOGLE_TOKEN_URL, GOOGLE_USERINFO_URL } from '../constants';
import { CustomErrorHandler, logger } from '../utils';

export type GoogleProfile = {
  id: string;
  email?: string;
  verified_email?: boolean;
  name?: string;
  picture?: string;
};

export const getGoogleTokens = async (code: string) => {
  try {
    const { data } = await axios.post<{ access_token: string }>(
      GOOGLE_TOKEN_URL,
      new URLSearchParams({
        code,
        client_id: envConfig.GOOGLE_AUTH_CLIENT_ID,
        client_secret: envConfig.GOOGLE_AUTH_CLIENT_SECRET,
        redirect_uri: envConfig.GOOGLE_AUTH_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      },
    );

    return data.access_token;
  } catch (error) {
    logger.error('Google token exchange failed', error);
    throw CustomErrorHandler.unAuthorized('Could not verify your Google account');
  }
};

export const getGoogleProfile = async (accessToken: string) => {
  try {
    const { data } = await axios.get<GoogleProfile>(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 10000,
    });

    return data;
  } catch (error) {
    logger.error('Google profile lookup failed', error);
    throw CustomErrorHandler.unAuthorized('Could not read your Google profile');
  }
};
