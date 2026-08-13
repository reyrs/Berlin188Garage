import type { InputHTMLAttributes } from 'react';

// Input harga/biaya — nampilin "Rp" + titik ribuan pas ngetik (mis. "1.250.000"),
// tapi value yang dikirim ke onChange tetap digit mentah ("1250000") biar gampang
// di-Number()-in di caller. Dipakai di semua form biaya (jasa pasang, sparepart
// custom, pengeluaran, pembayaran) biar SA/kasir/gudang gak salah baca nol.
interface RupiahInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string;
  onChange: (rawDigits: string) => void;
}

const formatRibuan = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export default function RupiahInput({ value, onChange, className = '', placeholder, ...rest }: RupiahInputProps) {
  const digits = value.replace(/\D/g, '');
  const display = digits ? formatRibuan(digits) : '';

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs font-sans font-bold">
        Rp
      </span>
      <input
        {...rest}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        placeholder={placeholder}
        className={`pl-8 ${className}`}
      />
    </div>
  );
}
