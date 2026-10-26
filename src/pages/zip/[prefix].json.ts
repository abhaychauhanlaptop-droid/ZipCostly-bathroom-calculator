// Static per-ZIP-prefix data files (/zip/981.json). The calculator fetches one when a ZIP is entered.
import type { APIRoute, GetStaticPaths } from 'astro';
import { allPrefixes, buildShard } from '../../lib/data';

export const getStaticPaths: GetStaticPaths = () => allPrefixes().map((prefix) => ({ params: { prefix } }));

export const GET: APIRoute = ({ params }) => new Response(JSON.stringify(buildShard(params.prefix!)));
