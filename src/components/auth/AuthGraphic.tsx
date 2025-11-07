export default function AuthGraphic() {
  return (
    <div className="relative hidden lg:flex flex-col items-center justify-center w-1/2 bg-primary-main text-white p-8">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold">Zyra Legal</h1>
        <p className="mt-4 text-lg text-primary-contrast-text/80">
          Inteligência Artificial para uma advocacia mais eficiente.
        </p>
      </div>
      <div className="absolute bottom-4 text-xs text-primary-contrast-text/50">
        <p>© {new Date().getFullYear()} Zyra Legal. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}
