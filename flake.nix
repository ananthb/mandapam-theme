{
  description = "Mandapam Hugo theme development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    git-hooks = {
      url = "github:cachix/git-hooks.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, git-hooks }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        vendoredFiles = "assets/scss/bootstrap/.*";

        pre-commit = git-hooks.lib.${system}.run {
          src = ./.;
          hooks = {
            check-merge-conflicts.enable = true;
            check-toml.enable = true;
            check-yaml.enable = true;
            detect-private-keys.enable = true;
            end-of-file-fixer = {
              enable = true;
              excludes = [ vendoredFiles ];
            };
            trim-trailing-whitespace = {
              enable = true;
              excludes = [ vendoredFiles ];
            };
          };
        };

      in
      {
        packages.site = pkgs.stdenv.mkDerivation {
          pname = "mandapam-theme-site";
          version = if (self ? shortRev) then self.shortRev else "dev";
          src = ./.;

          nativeBuildInputs = [ pkgs.hugo pkgs.dart-sass pkgs.go pkgs.git ];

          buildPhase = ''
            export HOME=$TMPDIR
            hugo build --minify --buildDrafts --source exampleSite --enableGitInfo=false
          '';

          installPhase = ''
            cp -r exampleSite/public $out
          '';
        };

        checks = {
          inherit pre-commit;
          site = self.packages.${system}.site;
        };

        devShells.default = pkgs.mkShell {
          name = "mandapam-theme";

          packages = [
            pkgs.git
            pkgs.go
            pkgs.hugo
            pkgs.dart-sass
            pkgs.nodejs
            pkgs.playwright-driver.browsers
          ];

          shellHook = ''
            ${pre-commit.shellHook}
            export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
            export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
          '';
        };
      }
    ) // {
      garnix = {
        builds = {
          exclude = [ "aarch64-darwin" "x86_64-darwin" "aarch64-linux" ];
        };
      };
    };
}
