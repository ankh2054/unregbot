const { Signature, PublicKey, Transaction } = require('@greymass/eosio');

class WalletPluginPublicKey {
  /**
   * Verifies a signature against a transaction and a chain ID.
   * @param {string} signature - The signature to verify.
   * @param {Object} transaction - The transaction data.
   * @param {string} chainId - The chain ID of the blockchain.
   * @returns {boolean} - True if the signature is valid, false otherwise.
   */
  static verifySignature(signature, transaction, chainId) {
    try {
      // Get the digest from the transaction
      const digest = Transaction.from(transaction).signingDigest(chainId);

      // Recover the public key from the signature and digest
      const signatureInstance = Signature.from(signature);
      const recoveredPublicKey = signatureInstance.recoverDigest(digest);

      // Verify the signature against the digest
      return signatureInstance.verifyDigest(digest, recoveredPublicKey);
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  }
}

module.exports = WalletPluginPublicKey;