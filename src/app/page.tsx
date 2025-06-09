import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="header flex flex-col items-center min-h-screen">
      <Image className="" alt="flower" src="/decot_flower.png" quality={80} width={120} height={300}></Image>
      <h1 className="text-4xl text-center mb-1 items-center ml-4 mr-4">Ana Clara Decot</h1>
      <h2 className="text-xl text-center mb-4 ml-4 mr-4">Psicóloga | CRP 05/65773</h2>
      <h3 className="text-2xl text-center text-[var(--decot-blue)] font-bold mb-10 mx-auto">Acolhimento e escuta para todas as fases da vida</h3>
      <Image className="mb-4" src="/french_bulldog_contructor.png" alt="Buldog Francês Construtor" width={150} height={150} />
      <h3 className="text-[var(--decot-pink)] font-bold mb-6">. . site em contrução :) </h3>
      <Link className="font-bold mb-4" href="https://wa.me/5521984148780">Agende sua consulta</Link>
      <div className="flex space-x-5 mb-8">
        <Link className="" href="https://wa.me/5521984148780">
        <Image className="" src="/whatsapp_decot.png" alt="Logo WhatsApp" width={50} height={50} />
        </Link>
        <Link className="" href="https://www.instagram.com/psi.decot/">
        <Image className="" src="/instagram_decot.png" alt="Logo Instagram" width={50} height={50} />
        </Link>
      </div>
      <footer className="mt-auto mb-4 text-sm text-gray-500 text-center">
        <p>© 2025 PsiDecot. Todos os direitos reservados.</p>
        <p>Designed and developed by <span className="font-bold"> <Link href="https://wa.me/5521983332127">@studioscoxa</Link></span> </p>
      </footer>
      </div>
  );
} 