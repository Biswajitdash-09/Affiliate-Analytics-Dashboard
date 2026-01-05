/**
 * AffiliatePro Tracking Script
 * 
 * Usage:
 * <script src="https://your-domain.com/tracking.js"></script>
 * 
 * This script automatically handles:
 * 1. Detecting affiliate_id and campaign_id from URL
 * 2. Logging the click to the server
 * 3. Storing the click_id in a cookie/localStorage
 * 4. Exposing a global Affiliate.conversion() method
 */

(function (window, document) {
    'use strict';

    const CONFIG = {
        // Dynamically determine API base URL based on script source or current origin
        // For now, we assume it's hosted on the same domain
        API_BASE: window.location.origin,
        COOKIE_NAME: 'aff_click_id',
        STORAGE_KEY: 'aff_click_id',
        CLICK_ENDPOINT: '/api/tracking/click',
        CONVERSION_ENDPOINT: '/api/tracking/click' // Using PUT method on same route
    };

    const Affiliate = {
        /**
         * Initialize tracking
         */
        init: function () {
            // Check for URL parameters
            const params = new URLSearchParams(window.location.search);
            const affiliateId = params.get('affiliate_id') || params.get('ref');
            const campaignId = params.get('campaign_id') || params.get('cid');

            if (affiliateId && campaignId) {
                this.trackClick(affiliateId, campaignId);
            }
        },

        /**
         * Track a click event
         */
        trackClick: function (affiliateId, campaignId) {
            console.log('AffiliatePro: Tracking click...', { affiliateId, campaignId });

            const payload = {
                affiliate_id: affiliateId,
                campaign_id: campaignId,
                referrer: document.referrer,
                url: window.location.href
            };

            // We use the GET endpoint (or POST) for clicks. 
            // Since the API expects query params for GET/POST usually, let's match the API signature.
            // The API implementation I saw uses query params: ?affiliate_id=...

            const endpoint = `${CONFIG.API_BASE}${CONFIG.CLICK_ENDPOINT}?affiliate_id=${encodeURIComponent(affiliateId)}&campaign_id=${encodeURIComponent(campaignId)}&redirect_url=${encodeURIComponent(window.location.href)}`;

            // Use Beacon API if available for reliability during navigation, otherwise fetch
            if (navigator.sendBeacon) {
                // Beacon sends POST. The API handles POST.
                // We need to make sure the API doesn't just redirect if we are doing a background log.
                // Actually, the current API redirects. This script is for "landing on the page".
                // Use fetch with 'no-cors' or similar if we don't want to follow redirect?
                // Or better: The API currently redirects. This script is for when the user LANDS on the page
                // via a link that ALREADY has params. 
                // If we call the API, it will try to redirect. 
                // We just want to LOG. 
                // Ideally we should have a JSON mode.

                // Use a special param to indicate we want JSON response, not redirect
                fetch(endpoint + '&json=true', {
                    method: 'POST',
                    keepalive: true
                }).then(res => res.json())
                    .then(data => {
                        if (data.clickId) {
                            this.storeClickId(data.clickId);
                        }
                    })
                    .catch(err => console.error('AffiliatePro: Tracking failed', err));

            } else {
                // Fallback
                fetch(endpoint + '&json=true', { method: 'POST' })
                    .then(res => res.json())
                    .then(data => {
                        if (data.clickId) this.storeClickId(data.clickId);
                    });
            }
        },

        /**
         * Store click ID for attribution
         */
        storeClickId: function (clickId) {
            if (!clickId) return;

            // 1. LocalStorage
            try {
                localStorage.setItem(CONFIG.STORAGE_KEY, clickId);
            } catch (e) { }

            // 2. Cookie (30 days)
            const d = new Date();
            d.setTime(d.getTime() + (30 * 24 * 60 * 60 * 1000));
            const expires = "expires=" + d.toUTCString();
            document.cookie = CONFIG.COOKIE_NAME + "=" + clickId + ";" + expires + ";path=/";

            console.log('AffiliatePro: Conversion tracking enabled for click', clickId);
        },

        /**
         * Get stored click ID
         */
        getClickId: function () {
            // Try local storage
            let id = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (id) return id;

            // Try cookie
            const name = CONFIG.COOKIE_NAME + "=";
            const decodedCookie = decodeURIComponent(document.cookie);
            const ca = decodedCookie.split(';');
            for (let i = 0; i < ca.length; i++) {
                let c = ca[i];
                while (c.charAt(0) === ' ') {
                    c = c.substring(1);
                }
                if (c.indexOf(name) === 0) {
                    return c.substring(name.length, c.length);
                }
            }
            return null;
        },

        /**
         * Trigger a conversion
         * @param {Object} data - { amount, transactionId, revenue }
         */
        conversion: function (data = {}) {
            const clickId = this.getClickId();
            if (!clickId) {
                console.warn('AffiliatePro: No click ID found. Attribution skipped.');
                return;
            }

            const conversionData = {
                clickId: clickId,
                revenueAmount: data.amount || data.revenue || 0,
                transactionId: data.transactionId || ('txn_' + Date.now())
            };

            console.log('AffiliatePro: Reporting conversion...', conversionData);

            fetch(`${CONFIG.API_BASE}${CONFIG.CONVERSION_ENDPOINT}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(conversionData)
            })
                .then(res => res.json())
                .then(res => {
                    console.log('AffiliatePro: Conversion reported! ', res);
                })
                .catch(err => {
                    console.error('AffiliatePro: Conversion error', err);
                });
        }
    };

    // Expose to window
    window.Affiliate = Affiliate;

    // Auto-init
    if (document.readyState === 'complete') {
        Affiliate.init();
    } else {
        window.addEventListener('load', () => Affiliate.init());
    }

})(window, document);
