<?php

test('redirects guests from the authenticated home route to login', function () {
    $this->get(route('home'))
        ->assertRedirect(route('login'));
});
