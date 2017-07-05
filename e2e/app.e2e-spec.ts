import { AuthenticationChatPage } from './app.po';

describe('authentication-chat App', () => {
  let page: AuthenticationChatPage;

  beforeEach(() => {
    page = new AuthenticationChatPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
