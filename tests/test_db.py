"""
Tests for SqliteStore backend (M66)
"""
import pytest
import os
import tempfile
from db import SqliteStore


@pytest.fixture
def store():
    """Create a fresh SqliteStore instance for each test."""
    db_path = tempfile.mktemp(suffix=".db")
    store = SqliteStore(db_path)
    yield store
    # Cleanup
    if os.path.exists(db_path):
        os.remove(db_path)
        # Remove WAL and SHM files if they exist
        for ext in ["-wal", "-shm"]:
            wal_path = db_path + ext
            if os.path.exists(wal_path):
                os.remove(wal_path)


class TestOrders:
    """Tests for order operations."""

    def test_add_order(self, store):
        """Test adding a new order."""
        order = {
            "orderId": "TEST-001",
            "name": "Test User",
            "total": 100000
        }
        store.add_order(order)

        # Verify order was saved
        result = store.get_order_by_id("TEST-001")
        assert result is not None
        assert result["orderId"] == "TEST-001"
        assert result["name"] == "Test User"
        assert result["total"] == 100000

    def test_get_order_by_id(self, store):
        """Test retrieving an order by ID."""
        order = {
            "orderId": "TEST-002",
            "name": "John Doe",
            "total": 250000,
            "status": "pending"
        }
        store.add_order(order)

        result = store.get_order_by_id("TEST-002")
        assert result is not None
        assert result["name"] == "John Doe"
        assert result["status"] == "pending"

    def test_get_nonexistent_order(self, store):
        """Test retrieving an order that doesn't exist."""
        result = store.get_order_by_id("NONEXISTENT")
        assert result is None

    def test_update_order_status(self, store):
        """Test updating order status."""
        order = {
            "orderId": "TEST-003",
            "name": "Jane Doe",
            "total": 500000,
            "status": "pending"
        }
        store.add_order(order)

        # Update status
        result = store.update_order_status("TEST-003", "confirmed")
        assert result is True

        # Verify status was updated
        updated = store.get_order_by_id("TEST-003")
        assert updated["status"] == "confirmed"

    def test_update_order_status_invalid(self, store):
        """Test updating order status with invalid status."""
        order = {
            "orderId": "TEST-004",
            "name": "Test",
            "total": 100000
        }
        store.add_order(order)

        result = store.update_order_status("TEST-004", "invalid_status")
        assert result is False


class TestStock:
    """Tests for stock operations."""

    def test_update_stock_in(self, store):
        """Test adding stock (stock in)."""
        # First add a product to stock table
        product = {"id": "PROD-001", "name": "Test Product", "stock": 10}
        with store.get_db() as db:
            db.execute("INSERT OR REPLACE INTO stock (id, data) VALUES (?, ?)",
                       ("PROD-001", store.__class__.__dict__.get('__module__', '') and '{"id": "PROD-001", "name": "Test Product", "stock": 10}'))
            import json
            db.execute("INSERT OR REPLACE INTO stock (id, data) VALUES (?, ?)",
                       ("PROD-001", json.dumps(product)))

        result = store.update_stock("PROD-001", "in", 5, "Test restock")
        assert result["ok"] is True
        assert result["new_stock"] == 15

    def test_update_stock_out(self, store):
        """Test removing stock (stock out)."""
        import json
        product = {"id": "PROD-002", "name": "Test Product 2", "stock": 20}
        with store.get_db() as db:
            db.execute("INSERT OR REPLACE INTO stock (id, data) VALUES (?, ?)",
                       ("PROD-002", json.dumps(product)))

        result = store.update_stock("PROD-002", "out", 5, "Test sale")
        assert result["ok"] is True
        assert result["new_stock"] == 15

    def test_update_stock_insufficient(self, store):
        """Test removing more stock than available."""
        import json
        product = {"id": "PROD-003", "name": "Test Product 3", "stock": 5}
        with store.get_db() as db:
            db.execute("INSERT OR REPLACE INTO stock (id, data) VALUES (?, ?)",
                       ("PROD-003", json.dumps(product)))

        result = store.update_stock("PROD-003", "out", 10, "Test insufficient")
        assert "error" in result
        assert "insufficient stock" in result["error"]

    def test_update_stock_not_found(self, store):
        """Test updating stock for non-existent product."""
        result = store.update_stock("NONEXISTENT", "in", 5)
        assert "error" in result
        assert "not found" in result["error"]

    def test_update_stock_invalid_action(self, store):
        """Test updating stock with invalid action."""
        import json
        product = {"id": "PROD-004", "name": "Test Product 4", "stock": 10}
        with store.get_db() as db:
            db.execute("INSERT OR REPLACE INTO stock (id, data) VALUES (?, ?)",
                       ("PROD-004", json.dumps(product)))

        result = store.update_stock("PROD-004", "invalid", 5)
        assert "error" in result
        assert "action must be 'in' or 'out'" in result["error"]


class TestIntegration:
    """Integration tests for combined operations."""

    def test_order_and_stock_workflow(self, store):
        """Test complete order + stock workflow."""
        import json

        # Setup product
        product = {"id": "PROD-100", "name": "K-Beauty Cream", "stock": 50}
        with store.get_db() as db:
            db.execute("INSERT OR REPLACE INTO stock (id, data) VALUES (?, ?)",
                       ("PROD-100", json.dumps(product)))

        # Create order
        order = {
            "orderId": "ORDER-100",
            "name": "Customer A",
            "total": 300000,
            "status": "pending"
        }
        store.add_order(order)

        # Verify order exists
        saved_order = store.get_order_by_id("ORDER-100")
        assert saved_order is not None
        assert saved_order["status"] == "pending"

        # Update stock when order ships
        stock_result = store.update_stock("PROD-100", "out", 3, "Order ORDER-100")
        assert stock_result["ok"] is True
        assert stock_result["new_stock"] == 47

        # Update order status to completed
        store.update_order_status("ORDER-100", "completed")
        final_order = store.get_order_by_id("ORDER-100")
        assert final_order["status"] == "completed"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
