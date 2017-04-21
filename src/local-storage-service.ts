export default class LocalStorageService {
  public isStorageSupported(storageType: string = null): boolean {
    // 'sessionStorage' is another possible value
    storageType = storageType || 'localStorage';
    try {
      const storage = window[storageType];
      // Safari in private mode supplies a storage object with 0 quota, 
      // so ensure that we can actually read to and write from storage
      const x = '__storage_test__';
      storage.setItem(x, x);
      storage.removeItem(x);
      return true;
    } catch (e) {
      return false;
    }
  }

  public set<T>(key: string, object: T): void {
    window.localStorage.setItem(key, JSON.stringify(object));
  }

  public get<T>(key: string): T {
    return JSON.parse(window.localStorage.getItem(key));
  }

  public remove(key: string): void {
    window.localStorage.removeItem(key);
  }
}
