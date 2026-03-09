import desktopBrandJson from "../desktopBrand.json" with { type: "json" };

interface DesktopBrand {
  readonly appId: string;
  readonly artifactName: string;
  readonly author: string;
  readonly description: string;
  readonly devProductName: string;
  readonly devUserDataDirName: string;
  readonly packageName: string;
  readonly productName: string;
  readonly userDataDirName: string;
}

function readBrandString(value: unknown, key: keyof DesktopBrand): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Desktop brand config "${key}" must be a non-empty string.`);
  }

  return value.trim();
}

function createDesktopBrand(value: unknown): DesktopBrand {
  if (typeof value !== "object" || value === null) {
    throw new Error("Desktop brand config must be an object.");
  }

  const brandRecord = value as Record<string, unknown>;

  return {
    appId: readBrandString(brandRecord.appId, "appId"),
    artifactName: readBrandString(brandRecord.artifactName, "artifactName"),
    author: readBrandString(brandRecord.author, "author"),
    description: readBrandString(brandRecord.description, "description"),
    devProductName: readBrandString(brandRecord.devProductName, "devProductName"),
    devUserDataDirName: readBrandString(brandRecord.devUserDataDirName, "devUserDataDirName"),
    packageName: readBrandString(brandRecord.packageName, "packageName"),
    productName: readBrandString(brandRecord.productName, "productName"),
    userDataDirName: readBrandString(brandRecord.userDataDirName, "userDataDirName"),
  };
}

export const desktopBrand = createDesktopBrand(desktopBrandJson);

export function getDesktopProductName(isDevelopment: boolean): string {
  return isDevelopment ? desktopBrand.devProductName : desktopBrand.productName;
}

export function getDesktopUserDataDirName(isDevelopment: boolean): string {
  return isDevelopment ? desktopBrand.devUserDataDirName : desktopBrand.userDataDirName;
}

export function getDesktopLegacyUserDataDirName(isDevelopment: boolean): string {
  return getDesktopProductName(isDevelopment);
}
