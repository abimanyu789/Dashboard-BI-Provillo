import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    // Error dari Fortify saat kredensial salah masuk ke errors.email,
    // tapi field email sudah terisi — beda dengan error "email wajib diisi"
    const emailEmpty = errors.email && !data.email;
    const credentialsError = errors.email && !!data.email;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(store.url(), { resetOnSuccess: ['password'] });
    };

    return (
        <>
            <Head title="Login — SIMOPRO" />

            {status && (
                <div className="mb-4 rounded-md bg-green-50 p-3 text-center text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {status}
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="grid gap-6">
                    {/* Email */}
                    <div className="grid gap-2">
                        <Label htmlFor="email">Alamat Email</Label>
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            autoFocus
                            tabIndex={1}
                            autoComplete="email"
                            placeholder="masukkan email Anda"
                            aria-invalid={!!emailEmpty}
                        />
                        {emailEmpty && (
                            <InputError message="Email wajib diisi" />
                        )}
                    </div>

                    {/* Password */}
                    <div className="grid gap-2">
                        <div className="flex items-center">
                            <Label htmlFor="password">Password</Label>
                            {canResetPassword && (
                                <TextLink
                                    href={request()}
                                    className="ml-auto text-sm"
                                    tabIndex={5}
                                >
                                    Lupa password?
                                </TextLink>
                            )}
                        </div>
                        <PasswordInput
                            id="password"
                            name="password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            tabIndex={2}
                            autoComplete="current-password"
                            placeholder="masukkan password Anda"
                            aria-invalid={!!errors.password}
                        />
                        {errors.password && (
                            <InputError message="Password wajib diisi" />
                        )}
                    </div>

                    {/* Remember me */}
                    <div className="flex items-center space-x-3">
                        <Checkbox
                            id="remember"
                            name="remember"
                            checked={data.remember}
                            onCheckedChange={(checked) => setData('remember', !!checked)}
                            tabIndex={3}
                        />
                        <Label htmlFor="remember">Ingat saya</Label>
                    </div>

                    {/* Error kredensial salah — tampil sebelum tombol */}
                    {credentialsError && (
                        <p className="text-sm text-red-600 dark:text-red-400">
                            Email atau password salah
                        </p>
                    )}

                    <Button
                        type="submit"
                        className="mt-4 w-full"
                        tabIndex={4}
                        disabled={processing}
                        data-test="login-button"
                    >
                        {processing && <Spinner />}
                        Masuk
                    </Button>
                </div>
            </form>
        </>
    );
}

Login.layout = {
    title: 'Masuk ke SIMOPRO',
    description: 'Masukkan email dan password untuk mengakses sistem manajemen operasional provillo',
};
