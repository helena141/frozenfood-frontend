import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gatewayRef, jumlah, metodePay, customerName, customerEmail } = body;

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey || serverKey.includes('GANTI_DENGAN')) {
      return NextResponse.json(
        {
          message:
            'MIDTRANS_SERVER_KEY belum diisi di .env.local. Silakan masukkan Server Key dari Dashboard Midtrans Sandbox.',
        },
        { status: 400 }
      );
    }

    const authString = Buffer.from(`${serverKey}:`).toString('base64');
    const uniqueMidtransOrderId = `${gatewayRef}-${Date.now().toString().slice(-4)}`;

    // Jika metodePay QRIS, batasi ke kanal QRIS/GoPay/ShopeePay agar Snap langsung menampilkan QR Code
    // Jika metodePay TRANSFER, tampilkan daftar Bank Virtual Account
    const enabledPayments =
      metodePay === 'TRANSFER'
        ? ['bca_va', 'bni_va', 'bri_va', 'echannel', 'permata_va', 'other_va']
        : ['other_qris', 'gopay', 'shopeepay'];

    const payload = {
      transaction_details: {
        order_id: uniqueMidtransOrderId,
        gross_amount: Math.round(Number(jumlah) || 10000),
      },
      enabled_payments: enabledPayments,
      customer_details: {
        first_name: customerName || 'Pelanggan Lezzat',
        email: customerEmail || 'customer@lezzat.id',
      },
    };

    const response = await fetch(
      'https://app.sandbox.midtrans.com/snap/v1/transactions',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Basic ${authString}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          message:
            data?.error_messages?.join(', ') ||
            'Gagal membuat transaksi Snap ke Midtrans Sandbox.',
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      token: data.token,
      redirect_url: data.redirect_url,
      midtransOrderId: uniqueMidtransOrderId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Terjadi kesalahan saat menghubungi Midtrans Sandbox.',
      },
      { status: 500 }
    );
  }
}
