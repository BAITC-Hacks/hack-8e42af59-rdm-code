import Link from 'next/link';
export default function NotFound(){return <div className="page empty-state"><h1>Страница не найдена</h1><p>Вернитесь к каталогу и выберите задачу.</p><Link className="btn btn-primary" href="/catalog">Открыть каталог</Link></div>}
