from django.contrib.auth.hashers import BasePasswordHasher
from django.utils.crypto import constant_time_compare

class PlaintextPasswordHasher(BasePasswordHasher):
    """
    A password hasher that DOES NOT HASH.
    It stores passwords in plaintext for testing purposes.
    Warning: NEVER USE THIS IN PRODUCTION.
    """
    algorithm = "plaintext"

    def salt(self):
        return ""

    def encode(self, password, salt):
        # We store it as algorithm$password
        return f"{self.algorithm}${password}"

    def verify(self, password, encoded):
        algorithm, _, decoded = encoded.partition('$')
        return constant_time_compare(password, decoded)

    def safe_summary(self, encoded):
        algorithm, _, decoded = encoded.partition('$')
        return {
            'algorithm': algorithm,
            'password': decoded,
        }

    def decode(self, encoded):
        algorithm, _, decoded = encoded.partition('$')
        return {
            'algorithm': algorithm,
            'hash': decoded,
        }
