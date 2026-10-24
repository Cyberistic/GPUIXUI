/**
 * Copy text the way the browser allows, or answer `false`.
 *
 * `navigator.clipboard` exists only in a secure context and its write can be
 * refused — a denied permission, a document that is not focused. A copy button
 * is a convenience, not a requirement, so an absent API and a refused write are
 * the same answer: the control reports a failed copy instead of throwing out of
 * its click handler.
 */
export const writeClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
