import LocalStorageService from './local-storage-service';
import { autoinject } from 'aurelia-dependency-injection';

import JwtTokenService, { JwtClaims } from './jwt-token-service';
import { objectAssign } from './oauth-polyfills';

export interface OAuthTokenConfig {
  name: string;
  urlTokenParameters?: {
    idToken: string;
    tokenType?: string;
  };
  expireOffsetSeconds?: number;
  persistTokenToLocalStorage: false;
  localStorageTokenKey: string;
}

export interface OAuthTokenData {
  token: string;
  tokenType: string;
  expiresAt: number;
  jwtClaims?: JwtClaims;
}

@autoinject()
export class OAuthTokenService {

  public config: OAuthTokenConfig;
  private tokenData: OAuthTokenData;

  constructor(private jwtTokenService: JwtTokenService, private localStorageService: LocalStorageService) {
    this.config = {
      name: 'id_token',
      urlTokenParameters: {
        idToken: 'id_token',
        tokenType: 'token_type'
      },
      expireOffsetSeconds: 60,
      persistTokenToLocalStorage: false,
      localStorageTokenKey: 'oauthAccessToken'
    };
  }

  public configure = (config: OAuthTokenConfig): OAuthTokenConfig => {

    // Extend default configuration with supplied config data
    if (config.urlTokenParameters) {
      config.urlTokenParameters = objectAssign(this.config.urlTokenParameters, config.urlTokenParameters);
    }

    this.config = objectAssign(this.config, config);

    return config;
  };

  public createToken = (urlTokenData: any): OAuthTokenData => {
    const token = urlTokenData[this.config.urlTokenParameters.idToken];
    const tokenType = urlTokenData[this.config.urlTokenParameters.tokenType] || 'Bearer';

    if (!token) {
      return null;
    }

    const claims: JwtClaims = this.jwtTokenService.getJwtClaims(token);
    const issuedTime = claims.nbf ? claims.nbf : claims.iat;
    const expirationTime = claims.exp - issuedTime;

    return {
      token: token,
      tokenType: tokenType,
      expiresAt: this.getTimeNow() + expirationTime,
      jwtClaims: claims
    };
  };

  public setToken = (data: OAuthTokenData): OAuthTokenData => {
    if (this.config.persistTokenToLocalStorage && this.localStorageService.isStorageSupported()) {
      if (data) {
        this.localStorageService.set(this.config.localStorageTokenKey, data);
      } else {
        this.localStorageService.remove(this.config.localStorageTokenKey);
      }
    }
    return this.tokenData = data;
  };

  public getToken = (): OAuthTokenData => {

    if (!this.tokenData && this.config.persistTokenToLocalStorage && this.localStorageService.isStorageSupported()) {
      return this.tokenData = this.localStorageService.get<OAuthTokenData>(this.config.localStorageTokenKey);
    } else {
      return this.tokenData;
    }
  };

  public getIdToken = (): string => {
    return this.getToken() ? this.getToken().token : undefined;
  };

  public getAuthorizationHeader = (): string => {
    if (!(this.getTokenType() && this.getIdToken())) {
      return '';
    }

    const tokenType = this.getTokenType().charAt(0).toUpperCase() + this.getTokenType().substr(1);

    return `${tokenType} ${this.getIdToken()}`;
  };

  public getTokenType = (): string => {
    return this.getToken() ? this.getToken().tokenType : undefined;
  };

  public getTokenExpirationTime = (): number => {
    const tokenRenewalOffsetSeconds = 30;
    const expireOffset = this.config.expireOffsetSeconds + tokenRenewalOffsetSeconds;

    return (this.tokenData.expiresAt - this.getTimeNow() - expireOffset);
  };

  public removeToken = (): OAuthTokenData => {
    if (this.tokenData && this.config.persistTokenToLocalStorage && this.localStorageService.isStorageSupported()) {
      this.localStorageService.remove(this.config.localStorageTokenKey);
    }

    return this.tokenData = null;
  };

  public isTokenValid = (): boolean => {
    const token = this.getToken();

    if (!token) {
      return false;
    }

    const timeNow = this.getTimeNow();
    const expiresAt = token.expiresAt;
    const isValid = (expiresAt && (expiresAt > timeNow + this.config.expireOffsetSeconds));

    return isValid;
  };

  private getTimeNow = (): number => {
    return Math.round(new Date().getTime() / 1000.0);
  };

}
