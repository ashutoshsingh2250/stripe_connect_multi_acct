import Stripe from 'stripe';

import { createUser } from '../services/userService';

const stripe = new Stripe(process.env['STRIPE_SECRET_KEY'] || '');

export async function importStripeAccounts() {
    // Load from environment
    const stripeImportPassword = process.env['STRIPE_IMPORT_PASSWORD'] || 'stripe2024!';
    const masterAdminUser = process.env['MASTER_ADMIN_USER'] || 'admin';
    const masterAdminPassword = process.env['MASTER_ADMIN_PASSWORD'] || 'admin123';

    // 1. Import Stripe accounts
    const accounts = await stripe.accounts.list({ limit: 100 });
    for (const acct of accounts.data) {
        await createUser({
            stripeId: acct.id,
            username: acct.email || acct.id, // fallback if no email
            email: acct.email || undefined,
            name: acct.business_profile?.name || undefined,
            passwordHash: stripeImportPassword, // createUser will hash internally
            rawData: acct as any,
        });

        console.log(`Imported ${acct.id} with password from ENV`);
    }

    // 2. Add static master admin user
    await createUser({
        stripeId: '', // no Stripe account tied to this user
        username: masterAdminUser,
        email: undefined,
        name: 'Master Admin',
        passwordHash: masterAdminPassword, // createUser will hash internally
        rawData: {}, // optional empty object
    });

    console.log(`Master admin '${masterAdminUser}' added with password from ENV`);
}
