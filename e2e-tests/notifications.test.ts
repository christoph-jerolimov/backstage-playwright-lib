import { expect } from '@playwright/test';
import { test } from './fixtures';

// The backend URL and the static token of backend.auth.externalAccess in
// app-config/app-config.{nfs,ofs}.yaml.
const backendUrl =
  process.env.PLAYWRIGHT_BACKEND_URL ?? 'http://localhost:7007';
const backendToken = 'e2e-tests-static-token';

test.describe('Notifications', () => {
  // The notifications plugin is part of the app template since 1.42.
  test.skip(
    ({ backstagePage }) => backstagePage.isVersionBetween('1.0', '1.41'),
    'The sidebar has no Notifications item in this version',
  );

  test.beforeEach(async ({ backstagePage }) => {
    await backstagePage.loginAsGuest();
  });

  test('opens Notifications from the sidebar', async ({ backstagePage }) => {
    await backstagePage.openSidebarItem('Notifications');
    await backstagePage.takeScreenshot('notifications');
  });

  test('shows a sent notification and its unread count', async ({
    page,
    request,
    backstagePage,
  }) => {
    // The token of the guest user, from the request that loads the
    // notifications.
    const notificationsRequest = page.waitForRequest(
      notifications =>
        notifications.url().startsWith(`${backendUrl}/api/notifications`) &&
        Boolean(notifications.headers().authorization),
    );
    await backstagePage.openSidebarItem('Notifications');
    const userAuthorization = (await notificationsRequest).headers()
      .authorization;

    // The sidebar item shows the number of unread notifications after its
    // label, e.g. "Notifications 1". Backstage 1.50 to 1.52 show two
    // Notifications items; only the second one shows the number.
    const sidebarItemWithCount = (count: number) =>
      backstagePage.allSidebarItems().filter({
        hasText: new RegExp(`^\\s*notifications\\s*${count}\\s*$`, 'i'),
      });
    await expect(backstagePage.sidebarItem('Notifications')).toBeVisible();
    await expect(sidebarItemWithCount(1)).toHaveCount(0);

    // Send a notification to all users via the notifications backend.
    const title = 'Hello from the Playwright tests';
    const sendResponse = await request.post(`${backendUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${backendToken}` },
      data: {
        recipients: { type: 'broadcast' },
        payload: {
          title,
          description:
            'This notification was sent by e2e-tests/notifications.test.ts.',
          link: '/catalog',
          severity: 'normal',
        },
      },
    });
    expect(sendResponse.ok()).toBeTruthy();
    const ids = ((await sendResponse.json()) as { id: string }[]).map(
      notification => notification.id,
    );

    try {
      // Reload the page, since not all versions push new notifications.
      await page.reload();
      await expect(page.getByText(title).first()).toBeVisible();
      await expect(sidebarItemWithCount(1)).toBeVisible();
      await backstagePage.takeScreenshot('notifications-sent');
    } finally {
      // Mark the notification as read, so that the unread count of the
      // sidebar item isn't shown in the screenshots of other tests.
      const readResponse = await request.post(
        `${backendUrl}/api/notifications/update`,
        {
          headers: { Authorization: userAuthorization },
          data: { ids, read: true },
        },
      );
      expect(readResponse.ok()).toBeTruthy();
    }
  });
});
