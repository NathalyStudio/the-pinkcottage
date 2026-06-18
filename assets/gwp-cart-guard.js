(function () {
  const GWP_KEYWORD = 'gwp';
  const EXCLUDED_TITLE = 'Free Unlimited Return + Package Protection Valid in US';
  let isEnforcing = false;

  /** @param {{ title: string, original_price: number }} item */
  function isGwpItem(item) {
    return item.title.toLowerCase().includes(GWP_KEYWORD) && item.original_price === 0;
  }

  /** @param {{ title: string, original_price: number }[]} items */
  function hasQualifyingPaidItem(items) {
    return items.some(
      (item) => item.original_price > 0 && item.title !== EXCLUDED_TITLE
    );
  }

  /** @param {number} itemCount */
  function refreshCart(itemCount) {
    document.dispatchEvent(
      new CustomEvent('cart:update', {
        bubbles: true,
        detail: {
          data: {
            itemCount,
            source: 'gwp-guard',
          },
        },
      })
    );
  }

  async function enforceGwpRule() {
    if (isEnforcing) return;
    isEnforcing = true;

    try {
      const cartResponse = await fetch('/cart.js');
      const cart = await cartResponse.json();

      const gwpItems = cart.items.filter(isGwpItem);
      if (gwpItems.length === 0) return;

      if (!hasQualifyingPaidItem(cart.items)) {
        /** @type {Record<string, number>} */
        const updates = {};
        gwpItems.forEach((item) => {
          updates[String(item.variant_id)] = 0;
        });

        const updateResponse = await fetch('/cart/update.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates }),
        });
        const updatedCart = await updateResponse.json();

        refreshCart(updatedCart.item_count);
      }
    } catch (error) {
      console.error('[GWP Guard]', error);
    } finally {
      isEnforcing = false;
    }
  }

  document.addEventListener('DOMContentLoaded', enforceGwpRule);
  document.addEventListener('cart:update', enforceGwpRule);
})();
