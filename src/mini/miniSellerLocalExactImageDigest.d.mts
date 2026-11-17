export function miniSellerLocalExactImageDigest(
  file:Pick<File,'arrayBuffer'|'size'>|null|undefined,
  subtle?:Pick<SubtleCrypto,'digest'>
):Promise<string|null>;
